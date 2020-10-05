import { eqNumber } from "@principia/core/Eq";
import { increment, pipe } from "@principia/core/Function";
import * as M from "@principia/core/Map";
import * as Mb from "@principia/core/Maybe";
import { just, Maybe, nothing } from "@principia/core/Maybe";

import { Exit } from "../Exit";
import * as XR from "../XRef/combinators";
import type { Ref } from "../XRef/XRef";
import * as T from "./_internal/effect";

export type Finalizer = (exit: Exit<any, any>) => T.Effect<unknown, never, any>;

export interface ReleaseMap {
   readonly ref: Ref<ManagedState>;
}

export interface Exited {
   readonly _tag: "Exited";
   readonly nextKey: number;
   readonly exit: Exit<any, any>;
}

export interface Running {
   readonly _tag: "Running";
   readonly nextKey: number;
   readonly finalizers: ReadonlyMap<number, Finalizer>;
}

export type ManagedState = Exited | Running;

export const running = (nextKey: number, finalizers: ReadonlyMap<number, Finalizer>): Running => ({
   _tag: "Running",
   nextKey,
   finalizers
});

export const exited = (nextKey: number, exit: Exit<any, any>): Exited => ({
   _tag: "Exited",
   nextKey,
   exit
});

export const finalizers = (state: Running): ReadonlyMap<number, Finalizer> => state.finalizers;

export const noopFinalizer: Finalizer = () => T.unit;

export function addIfOpen(finalizer: Finalizer) {
   return (_: ReleaseMap): T.Effect<unknown, never, Maybe<number>> =>
      pipe(
         _.ref,
         XR.modify<T.Effect<unknown, never, Maybe<number>>, ManagedState>((s) => {
            switch (s._tag) {
               case "Exited": {
                  return [
                     T._map(finalizer(s.exit), () => nothing()),
                     exited(increment(s.nextKey), s.exit)
                  ];
               }
               case "Running": {
                  return [
                     T.pure(just(s.nextKey)),
                     running(increment(s.nextKey), M.insert(s.nextKey, finalizer)(finalizers(s)))
                  ];
               }
            }
         }),
         T.flatten
      );
}

export function release(
   key: number,
   exit: Exit<any, any>
): (_: ReleaseMap) => T.Effect<unknown, never, any>;
export function release(key: number, exit: Exit<any, any>) {
   return (_: ReleaseMap) =>
      pipe(
         _.ref,
         XR.modify((s) => {
            switch (s._tag) {
               case "Exited": {
                  return [T.unit, s];
               }
               case "Running": {
                  return [
                     Mb._fold(
                        M._lookup(eqNumber)(finalizers(s), key),
                        () => T.unit,
                        (f) => f(exit)
                     ),
                     running(s.nextKey, M.remove(key)(finalizers(s)))
                  ];
               }
            }
         })
      );
}

export function add(finalizer: Finalizer) {
   return (_: ReleaseMap) =>
      T._map(
         addIfOpen(finalizer)(_),
         Mb.fold(
            (): Finalizer => () => T.unit,
            (k): Finalizer => (e) => release(k, e)(_)
         )
      );
}

export const releaseMap = (ref: Ref<ManagedState>): ReleaseMap => ({
   ref
});

export const makeReleaseMap = T._map(XR.makeRef<ManagedState>(running(0, new Map())), (s) =>
   releaseMap(s)
);
