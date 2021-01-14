import type { Cause } from '../Cause'
import type { Instruction } from './core'

export const _R = '_R'
export const _E = '_E'
export const _A = '_A'
export const _I = '_I'
export const _U = '_U'

export const IOTag = {
  Succeed: 'Succeed',
  FlatMap: 'FlatMap',
  EffectPartial: 'EffectPartial',
  EffectTotal: 'EffectTotal',
  Async: 'Async',
  Fold: 'Fold',
  Fork: 'Fork',
  Fail: 'Fail',
  Yield: 'Yield',
  Read: 'Read',
  Give: 'Give',
  EffectSuspend: 'EffectSuspend',
  Race: 'Race',
  SetInterrupt: 'SetInterrupt',
  GetInterrupt: 'GetInterrupt',
  CheckDescriptor: 'CheckDescriptor',
  Supervise: 'Supervise',
  EffectSuspendPartial: 'EffectSuspendPartial',
  NewFiberRef: 'NewFiberRef',
  ModifyFiberRef: 'ModifyFiberRef',
  GetForkScope: 'GetForkScope',
  OverrideForkScope: 'OverrideForkScope',
  Integration: 'Integration'
} as const

export class ExternalFail<E> {
  readonly _tag = IOTag.Fail;
  readonly [_U]: 'IO';
  readonly [_E]: () => E;
  readonly [_A]: () => never;
  readonly [_R]: (_: unknown) => void

  readonly _S1!: (_: unknown) => void
  readonly _S2!: () => never

  get [_I](): Instruction {
    return this as any
  }

  constructor(readonly cause: Cause<E>) {}
}
