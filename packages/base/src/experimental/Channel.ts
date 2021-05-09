import type { Cause } from '../Cause'
import type { Exit } from '../Exit'
import type { IO, URIO } from '../IO'
import type { AsyncInputProducer } from './internal/producer'

import * as Ex from '../Exit'

export const ChannelTag = {
  PipeTo: 'PipeTo',
  ContinuationK: 'ContinuationK',
  ContinuationFinalizer: 'ContinuationFinalizer',
  Fold: 'Fold',
  Bridge: 'Bridge',
  Read: 'Read',
  Done: 'Done',
  Halt: 'Halt',
  Effect: 'Effect',
  Emit: 'Emit',
  EffectTotal: 'EffectTotal',
  EffectSuspendTotal: 'EffectSuspendTotal',
  Ensuring: 'Ensuring',
  ConcatAll: 'ConcatAll',
  BracketOut: 'BracketOut',
  Provide: 'Provide',
  MergeDecision: 'MergeDecision'
} as const

export abstract class Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _Env!: (_: Env) => void
  readonly _InErr!: (_: InErr) => void
  readonly _InElem!: (_: InElem) => void
  readonly _InDone!: (_: InDone) => void
  readonly _OutErr!: () => OutErr
  readonly _OutElem!: () => OutElem
  readonly _OutDone!: () => OutDone
}

export abstract class Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> {
  readonly _Env!: (_: Env) => void
  readonly _InErr!: (_: InErr) => void
  readonly _InElem!: (_: InElem) => void
  readonly _InDone!: (_: InDone) => void
  readonly _OutErr!: (_: OutErr) => OutErr
  readonly _OutErr2!: () => OutErr2
  readonly _OutElem!: () => OutElem
  readonly _OutDone!: (_: OutDone) => OutDone
  readonly _OutDone2!: () => OutDone2
}

export class ContinuationK<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
> extends Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> {
  readonly _channelTag = ChannelTag.ContinuationK
  constructor(
    readonly onSuccess: (_: OutDone) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
    readonly onHalt: (_: Cause<OutErr>) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
  ) {
    super()
  }

  onExit(exit: Exit<OutErr, OutDone>): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
    return Ex.match_(exit, this.onHalt, this.onSuccess)
  }
}

export class ContinuationFinalizer<Env, OutErr, OutDone> extends Continuation<
  Env,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  never,
  OutDone,
  never
> {
  readonly _channelTag = ChannelTag.ContinuationFinalizer
  constructor(readonly finalizer: (_: Exit<OutErr, OutDone>) => URIO<Env, any>) {
    super()
  }
}

export function concreteContinuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>(
  _: Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
): asserts _ is
  | ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  | ContinuationFinalizer<Env, OutErr, OutDone> {
  //
}

export class PipeTo<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutElem2, OutDone, OutDone2> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem2,
  OutDone2
> {
  readonly _channelTag = ChannelTag.PipeTo
  constructor(
    readonly left: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly right: () => Channel<Env, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ) {
    super()
  }
}

export class Fold<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem,
  OutDone2
> {
  readonly _channelTag = ChannelTag.Fold
  constructor(
    readonly value: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly k: ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  ) {
    super()
  }
}

export class Read<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutElem2, OutDone, OutDone2> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem2,
  OutDone2
> {
  readonly _channelTag = ChannelTag.Read
  constructor(
    readonly more: (_: InElem) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>,
    readonly done: ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem2, OutDone, OutDone2>
  ) {
    super()
  }
}

export class Done<OutDone> extends Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  readonly _channelTag = ChannelTag.Done
  constructor(readonly terminal: OutDone) {
    super()
  }
}

export class Halt<OutErr> extends Channel<unknown, unknown, unknown, unknown, OutErr, never, never> {
  readonly _channelTag = ChannelTag.Halt
  constructor(readonly error: () => Cause<OutErr>) {
    super()
  }
}

export class Effect<Env, OutErr, OutDone> extends Channel<Env, unknown, unknown, unknown, OutErr, never, OutDone> {
  readonly _channelTag = ChannelTag.Effect
  constructor(readonly io: IO<Env, OutErr, OutDone>) {
    super()
  }
}

export class EffectTotal<OutDone> extends Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  readonly _channelTag = ChannelTag.EffectTotal
  constructor(readonly effect: () => OutDone) {
    super()
  }
}

export class EffectSuspendTotal<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _channelTag = ChannelTag.EffectSuspendTotal
  constructor(readonly effect: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) {
    super()
  }
}

export class Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _channelTag = ChannelTag.Ensuring
  constructor(
    readonly channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly finalizer: (_: Exit<OutErr, OutDone>) => IO<Env, never, any>
  ) {
    super()
  }
}

export class ConcatAll<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
> extends Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone3> {
  readonly _channelTag = ChannelTag.ConcatAll
  constructor(
    readonly combineInners: (_: OutDone, __: OutDone) => OutDone,
    readonly combineAll: (_: OutDone, __: OutDone2) => OutDone3,
    readonly value: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
    readonly k: (_: OutElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>
  ) {
    super()
  }
}

export class BracketOut<R, E, Z, OutDone> extends Channel<R, unknown, unknown, unknown, E, Z, OutDone> {
  readonly _channelTag = ChannelTag.BracketOut
  constructor(readonly acquire: IO<R, E, Z>, readonly finalizer: (_: Z, exit: Exit<any, any>) => URIO<R, any>) {
    super()
  }
}

export class Provide<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  unknown,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _channelTag = ChannelTag.Provide
  constructor(
    readonly environment: Env,
    readonly inner: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

export class Emit<OutElem, OutDone> extends Channel<unknown, unknown, unknown, unknown, never, OutElem, OutDone> {
  readonly _channelTag = ChannelTag.Emit
  constructor(readonly out: OutElem) {
    super()
  }
}

export class Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> {
  readonly _channelTag = ChannelTag.Bridge
  constructor(
    readonly input: AsyncInputProducer<InErr, InElem, InDone>,
    readonly channel: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

export function concrete<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  _: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): asserts _ is
  | PipeTo<Env, InErr, InElem, InDone, OutErr, any, OutElem, any, OutDone, any>
  | Read<Env, InErr, InElem, InDone, OutErr, any, OutElem, any, OutDone, any>
  | Done<OutDone>
  | Halt<OutErr>
  | Effect<Env, OutErr, OutDone>
  | Emit<OutElem, OutDone>
  | ConcatAll<Env, InErr, InElem, InDone, OutErr, any, OutElem, any, OutDone, any>
  | Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | Fold<Env, InErr, InElem, InDone, OutErr, any, OutElem, OutDone, any>
  | Provide<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | BracketOut<Env, OutErr, OutElem, OutDone>
  | Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  //
}
