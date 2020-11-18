import * as Eq from "../../Eq";
import { absurd, increment, pipe } from "../../Function";
import * as M from "../../Map";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { none, some } from "../../Option";
import type { Exit } from "../Exit";
import * as T from "../Task/_core";
import * as XR from "../XRef/_core";
import type { Ref } from "../XRef/model";

export type Finalizer = (exit: Exit<any, any>) => T.Task<unknown, never, any>;

export class ReleaseMap {
  constructor(readonly ref: Ref<State>) {}
}

export class Exited {
  readonly _tag = "Exited";
  constructor(readonly nextKey: number, readonly exit: Exit<any, any>) {}
}

export class Running {
  readonly _tag = "Running";
  constructor(readonly nextKey: number, readonly _finalizers: ReadonlyMap<number, Finalizer>) {}

  finalizers(): ReadonlyMap<number, Finalizer> {
    return this._finalizers as any;
  }
}

export type State = Exited | Running;

export function finalizers(state: Running): ReadonlyMap<number, Finalizer> {
  return state.finalizers();
}

export const noopFinalizer: Finalizer = () => T.unit();

export function addIfOpen(finalizer: Finalizer) {
  return (_: ReleaseMap): T.Task<unknown, never, Option<number>> =>
    pipe(
      _.ref,
      XR.modify<T.Task<unknown, never, Option<number>>, State>((s) => {
        switch (s._tag) {
          case "Exited": {
            return [
              T.map_(finalizer(s.exit), () => none()),
              new Exited(increment(s.nextKey), s.exit)
            ];
          }
          case "Running": {
            return [
              T.pure(some(s.nextKey)),
              new Running(increment(s.nextKey), M.insert(s.nextKey, finalizer)(finalizers(s)))
            ];
          }
        }
      }),
      T.flatten
    );
}

export function release(key: number, exit: Exit<any, any>) {
  return (_: ReleaseMap) =>
    pipe(
      _.ref,
      XR.modify((s) => {
        switch (s._tag) {
          case "Exited": {
            return [T.unit(), s];
          }
          case "Running": {
            return [
              O.fold_(
                M.lookup_(Eq.number)(s.finalizers(), key),
                () => T.unit(),
                (f) => f(exit)
              ),
              new Running(s.nextKey, M.remove_(s.finalizers(), key))
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
      O.fold(
        (): Finalizer => () => T.unit(),
        (k): Finalizer => (e) => release(k, e)(_)
      )
    );
}

export function replace(
  key: number,
  finalizer: Finalizer
): (_: ReleaseMap) => T.Task<unknown, never, Option<Finalizer>> {
  return (_) =>
    pipe(
      _.ref,
      XR.modify<T.Task<unknown, never, Option<Finalizer>>, State>((s) => {
        switch (s._tag) {
          case "Exited":
            return [T.map_(finalizer(s.exit), () => none()), new Exited(s.nextKey, s.exit)];
          case "Running":
            return [
              T.succeed(M.lookup_(Eq.number)(finalizers(s), key)),
              new Running(s.nextKey, M.insert_(finalizers(s), key, finalizer))
            ];
          default:
            return absurd(s);
        }
      }),
      T.flatten
    );
}

export const make = T.map_(XR.make<State>(new Running(0, new Map())), (s) => new ReleaseMap(s));
