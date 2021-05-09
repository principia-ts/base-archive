import type { Exit } from '../../Exit'
import type { IO } from '../../IO'

export const MergeDecisionTag = {
  Done: 'Done',
  Await: 'Await'
} as const

export abstract class MergeDecision<R, E0, Z0, E, Z> {
  readonly _U!: 'MergeDecision'
  readonly _R!: (_: R) => void
  readonly _E0!: (_: E0) => void
  readonly _Z0!: (_: Z0) => void
  readonly _E!: () => E
  readonly _Z!: () => Z
}

export class Done<R, E, Z> extends MergeDecision<R, unknown, unknown, E, Z> {
  readonly _mergeDecisionTag = MergeDecisionTag.Done
  constructor(readonly io: IO<R, E, Z>) {
    super()
  }
}

export class Await<R, E0, Z0, E, Z> extends MergeDecision<R, E0, Z0, E, Z> {
  readonly _mergeDecisionTag = MergeDecisionTag.Await
  constructor(readonly f: (_: Exit<E0, Z0>) => IO<R, E, Z>) {
    super()
  }
}

export function done<R, E, Z>(io: IO<R, E, Z>): MergeDecision<R, unknown, unknown, E, Z> {
  return new Done(io)
}

function _await<R, E0, Z0, E, Z>(f: (exit: Exit<E0, Z0>) => IO<R, E, Z>): MergeDecision<R, E0, Z0, E, Z> {
  return new Await(f)
}
export { _await as await }

export function awaitConst<R, E, Z>(io: IO<R, E, Z>): MergeDecision<R, unknown, unknown, E, Z> {
  return new Await(() => io)
}
