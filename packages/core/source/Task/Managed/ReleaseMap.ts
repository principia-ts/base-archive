import { eqNumber } from "@principia/prelude/Eq";

import { absurd, increment, pipe } from "../../Function";
import * as M from "../../Map";
import type { Option } from "../../Option";
import * as Mb from "../../Option";
import { none, some } from "../../Option";
import type { Exit } from "../Exit";
import * as XR from "../XRef/combinators";
import type { Ref } from "../XRef/model";
import * as T from "./_internal/task";

export type Finalizer = (exit: Exit<any, any>) => T.Task<unknown, never, any>;

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
   return (_: ReleaseMap): T.Task<unknown, never, Option<number>> =>
      pipe(
         _.ref,
         XR.modify<T.Task<unknown, never, Option<number>>, ManagedState>((s) => {
            switch (s._tag) {
               case "Exited": {
                  return [T.map_(finalizer(s.exit), () => none()), exited(increment(s.nextKey), s.exit)];
               }
               case "Running": {
                  return [
                     T.pure(some(s.nextKey)),
                     running(increment(s.nextKey), M.insert(s.nextKey, finalizer)(finalizers(s)))
                  ];
               }
            }
         }),
         T.flatten
      );
}

export function release(key: number, exit: Exit<any, any>): (_: ReleaseMap) => T.Task<unknown, never, any>;
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
                     Mb.fold_(
                        M.lookup_(eqNumber)(finalizers(s), key),
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
      T.map_(
         addIfOpen(finalizer)(_),
         Mb.fold(
            (): Finalizer => () => T.unit,
            (k): Finalizer => (e) => release(k, e)(_)
         )
      );
}

export const replace = (key: number, finalizer: Finalizer) => (
   _: ReleaseMap
): T.Task<unknown, never, Option<Finalizer>> =>
   pipe(
      _.ref,
      XR.modify<T.Task<unknown, never, Option<Finalizer>>, ManagedState>((s) => {
         switch (s._tag) {
            case "Exited":
               return [T.map_(finalizer(s.exit), () => none()), exited(s.nextKey, s.exit)];
            case "Running":
               return [
                  T.succeed(M.lookup_(eqNumber)(finalizers(s), key)),
                  running(s.nextKey, M.insert_(finalizers(s), key, finalizer))
               ];
            default:
               return absurd(s);
         }
      }),
      T.flatten
   );

export const ReleaseMap = (ref: Ref<ManagedState>): ReleaseMap => ({
   ref
});

export const makeReleaseMap = T.map_(XR.makeRef<ManagedState>(running(0, new Map())), (s) => ReleaseMap(s));
