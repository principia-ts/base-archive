import type { Either } from '../../../Either'
import type { Exit } from '../../../Exit'
import type { Fiber } from '../../../Fiber'
import type { IO } from '../../../IO'

export const BothRunningTag = Symbol()
export type BothRunningTag = typeof BothRunningTag
export const LeftDoneTag = Symbol()
export type LeftDoneTag = typeof LeftDoneTag
export const RightDoneTag = Symbol()
export type RightDoneTag = typeof RightDoneTag

export const MergeStateTag = {
  BothRunning: BothRunningTag,
  LeftDone: LeftDoneTag,
  RightDone: RightDoneTag
} as const

export class BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> {
  readonly _mergeStateTag: BothRunningTag = MergeStateTag.BothRunning
  constructor(readonly left: Fiber<Either<Err, Done>, Elem>, readonly right: Fiber<Either<Err1, Done1>, Elem>) {}
}

export class LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> {
  readonly _mergeStateTag: LeftDoneTag = MergeStateTag.LeftDone
  constructor(readonly f: (_: Exit<Err1, Done1>) => IO<Env, Err2, Done2>) {}
}

export class RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> {
  readonly _mergeStateTag: RightDoneTag = MergeStateTag.RightDone
  constructor(readonly f: (_: Exit<Err, Done>) => IO<Env, Err2, Done2>) {}
}

export type MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> =
  | BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
