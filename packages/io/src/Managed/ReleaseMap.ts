import type { Exit } from '../Exit'
import type { URef } from '../IORef/core'
import type { Option } from '@principia/base/Option'

import * as Eq from '@principia/base/Eq'
import { absurd, increment, pipe } from '@principia/base/Function'
import * as M from '@principia/base/Map'
import * as O from '@principia/base/Option'
import { None, Some } from '@principia/base/Option'

import * as I from '../IO/core'
import * as XR from '../IORef/core'

export type Finalizer = (exit: Exit<any, any>) => I.IO<unknown, never, any>

export class ReleaseMap {
  constructor(readonly ref: URef<State>) {}
}

export class Exited {
  readonly _tag = 'Exited'
  constructor(readonly nextKey: number, readonly exit: Exit<any, any>) {}
}

export class Running {
  readonly _tag = 'Running'
  constructor(readonly nextKey: number, readonly _finalizers: ReadonlyMap<number, Finalizer>) {}

  finalizers(): ReadonlyMap<number, Finalizer> {
    return this._finalizers as any
  }
}

export type State = Exited | Running

export function finalizers(state: Running): ReadonlyMap<number, Finalizer> {
  return state.finalizers()
}

export const noopFinalizer: Finalizer = () => I.unit()

export function addIfOpen(finalizer: Finalizer) {
  return (_: ReleaseMap): I.IO<unknown, never, Option<number>> =>
    pipe(
      _.ref,
      XR.modify<I.IO<unknown, never, Option<number>>, State>((s) => {
        switch (s._tag) {
          case 'Exited': {
            return [I.map_(finalizer(s.exit), () => None()), new Exited(increment(s.nextKey), s.exit)]
          }
          case 'Running': {
            return [
              I.pure(Some(s.nextKey)),
              new Running(increment(s.nextKey), M.insert(s.nextKey, finalizer)(finalizers(s)))
            ]
          }
        }
      }),
      I.flatten
    )
}

export function release(key: number, exit: Exit<any, any>) {
  return (_: ReleaseMap) =>
    pipe(
      _.ref,
      XR.modify((s) => {
        switch (s._tag) {
          case 'Exited': {
            return [I.unit(), s]
          }
          case 'Running': {
            return [
              O.match_(
                M.lookup_(s.finalizers(), key),
                () => I.unit(),
                (f) => f(exit)
              ),
              new Running(s.nextKey, M.remove_(s.finalizers(), key))
            ]
          }
        }
      })
    )
}

export function add(finalizer: Finalizer) {
  return (_: ReleaseMap) =>
    I.map_(
      addIfOpen(finalizer)(_),
      O.match(
        (): Finalizer => () => I.unit(),
        (k): Finalizer => (e) => release(k, e)(_)
      )
    )
}

export function replace(key: number, finalizer: Finalizer): (_: ReleaseMap) => I.IO<unknown, never, Option<Finalizer>> {
  return (_) =>
    pipe(
      _.ref,
      XR.modify<I.IO<unknown, never, Option<Finalizer>>, State>((s) => {
        switch (s._tag) {
          case 'Exited':
            return [I.map_(finalizer(s.exit), () => None()), new Exited(s.nextKey, s.exit)]
          case 'Running':
            return [
              I.succeed(M.lookup_(finalizers(s), key)),
              new Running(s.nextKey, M.insert_(finalizers(s), key, finalizer))
            ]
          default:
            return absurd(s)
        }
      }),
      I.flatten
    )
}

export const make = I.map_(XR.make<State>(new Running(0, new Map())), (s) => new ReleaseMap(s))
