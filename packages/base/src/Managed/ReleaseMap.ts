import type { Exit } from '../Exit'
import type { Option } from '../Option'
import type { URef } from '../Ref/core'

import { absurd, increment, pipe } from '../function'
import * as I from '../IO/core'
import * as M from '../Map'
import * as O from '../Option'
import { none, some } from '../Option'
import * as XR from '../Ref/core'

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

export function addIfOpen(_: ReleaseMap, finalizer: Finalizer): I.UIO<Option<number>> {
  return pipe(
    _.ref,
    XR.modify<I.IO<unknown, never, Option<number>>, State>((s) => {
      switch (s._tag) {
        case 'Exited': {
          return [I.map_(finalizer(s.exit), () => none()), new Exited(increment(s.nextKey), s.exit)]
        }
        case 'Running': {
          return [
            I.pure(some(s.nextKey)),
            new Running(increment(s.nextKey), M.insert(s.nextKey, finalizer)(finalizers(s)))
          ]
        }
      }
    }),
    I.flatten
  )
}

export function release(_: ReleaseMap, key: number, exit: Exit<any, any>) {
  return pipe(
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

export function add(_: ReleaseMap, finalizer: Finalizer): I.UIO<Finalizer> {
  return I.map_(
    addIfOpen(_, finalizer),
    O.match(
      (): Finalizer => () => I.unit(),
      (k): Finalizer =>
        (e) =>
          release(_, k, e)
    )
  )
}

export function replace(_: ReleaseMap, key: number, finalizer: Finalizer): I.UIO<Option<Finalizer>> {
  return pipe(
    _.ref,
    XR.modify<I.IO<unknown, never, Option<Finalizer>>, State>((s) => {
      switch (s._tag) {
        case 'Exited':
          return [I.map_(finalizer(s.exit), () => none()), new Exited(s.nextKey, s.exit)]
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

export const make = I.map_(XR.ref<State>(new Running(0, new Map())), (s) => new ReleaseMap(s))
