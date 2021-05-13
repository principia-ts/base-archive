import type { Cause } from '../../Cause'
import type { Exit } from '../../Exit'
import type { IO, URIO } from '../../IO'
import type { AsyncInputProducer } from './internal/producer'

import * as Ex from '../../Exit'
import { tuple } from '../../tuple'

export const PipeToTag = Symbol()
export type PipeToTag = typeof PipeToTag
export const ContinuationKTag = Symbol()
export type ContinuationKTag = typeof ContinuationKTag
export const ContinuationFinalizerTag = Symbol()
export type ContinuationFinalizerTag = typeof ContinuationFinalizerTag
export const FoldTag = Symbol()
export type FoldTag = typeof FoldTag
export const BridgeTag = Symbol()
export type BridgeTag = typeof BridgeTag
export const ReadTag = Symbol()
export type ReadTag = typeof ReadTag
export const DoneTag = Symbol()
export type DoneTag = typeof DoneTag
export const HaltTag = Symbol()
export type HaltTag = typeof HaltTag
export const EffectTag = Symbol()
export type EffectTag = typeof EffectTag
export const EmitTag = Symbol()
export type EmitTag = typeof EmitTag
export const EffectTotalTag = Symbol()
export type EffectTotalTag = typeof EffectTotalTag
export const EffectSuspendTotalTag = Symbol()
export type EffectSuspendTotalTag = typeof EffectSuspendTotalTag
export const EnsuringTag = Symbol()
export type EnsuringTag = typeof EnsuringTag
export const ConcatAllTag = Symbol()
export type ConcatAllTag = typeof ConcatAllTag
export const BracketOutTag = Symbol()
export type BracketOutTag = typeof BracketOutTag
export const ProvideTag = Symbol()
export type ProvideTag = typeof ProvideTag

export const ChannelTag = {
  PipeTo: PipeToTag,
  ContinuationK: ContinuationKTag,
  ContinuationFinalizer: ContinuationFinalizerTag,
  Fold: FoldTag,
  Bridge: BridgeTag,
  Read: ReadTag,
  Done: DoneTag,
  Halt: HaltTag,
  Effect: EffectTag,
  Emit: EmitTag,
  EffectTotal: EffectTotalTag,
  EffectSuspendTotal: EffectSuspendTotalTag,
  Ensuring: EnsuringTag,
  ConcatAll: ConcatAllTag,
  BracketOut: BracketOutTag,
  Provide: ProvideTag
} as const

export abstract class Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _Env!: (_: Env) => void
  readonly _InErr!: (_: InErr) => void
  readonly _InElem!: (_: InElem) => void
  readonly _InDone!: (_: InDone) => void
  readonly _OutErr!: () => OutErr
  readonly _OutElem!: () => OutElem
  readonly _OutDone!: () => OutDone;

  readonly ['>>>'] = <Env2, OutErr2, OutElem2, OutDone2>(
    that: Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ): Channel<Env & Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> =>
    new PipeTo<Env & Env2, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutElem2, OutDone, OutDone2>(
      () => this,
      () => that
    );

  readonly ['$>'] = <OutDone2>(z2: OutDone2): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> =>
    map_(this, () => z2);

  readonly ['>>='] = <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(
    f: (d: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  ): Channel<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone2
  > => bind_(this, f);

  readonly ['<*>'] = <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
  ): Channel<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    readonly [OutDone, OutDone1]
  > => zip_(this, that);

  readonly ['*>'] = <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
  ): Channel<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone1
  > => zipr_(this, that);

  readonly ['<*'] = <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
  ): Channel<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone
  > => zipl_(this, that)
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
  readonly _channelTag: ContinuationKTag = ChannelTag.ContinuationK
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
  readonly _channelTag: ContinuationFinalizerTag = ChannelTag.ContinuationFinalizer
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
  readonly _channelTag: PipeToTag = ChannelTag.PipeTo
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
  readonly _channelTag: FoldTag = ChannelTag.Fold
  constructor(
    readonly value: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly k: ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  ) {
    super()
  }
}

export class Read<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> extends Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem,
  OutDone2
> {
  readonly _channelTag: ReadTag = ChannelTag.Read
  constructor(
    readonly more: (_: InElem) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
    readonly done: ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  ) {
    super()
  }
}

export class Done<OutDone> extends Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  readonly _channelTag: DoneTag = ChannelTag.Done
  constructor(readonly terminal: () => OutDone) {
    super()
  }
}

export class Halt<OutErr> extends Channel<unknown, unknown, unknown, unknown, OutErr, never, never> {
  readonly _channelTag: HaltTag = ChannelTag.Halt
  constructor(readonly error: () => Cause<OutErr>) {
    super()
  }
}

export class Effect<Env, OutErr, OutDone> extends Channel<Env, unknown, unknown, unknown, OutErr, never, OutDone> {
  readonly _channelTag: EffectTag = ChannelTag.Effect
  constructor(readonly io: IO<Env, OutErr, OutDone>) {
    super()
  }
}

export class EffectTotal<OutDone> extends Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  readonly _channelTag: EffectTotalTag = ChannelTag.EffectTotal
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
  readonly _channelTag: EffectSuspendTotalTag = ChannelTag.EffectSuspendTotal
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
  readonly _channelTag: EnsuringTag = ChannelTag.Ensuring
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
  readonly _channelTag: ConcatAllTag = ChannelTag.ConcatAll
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
  readonly _channelTag: BracketOutTag = ChannelTag.BracketOut
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
  readonly _channelTag: ProvideTag = ChannelTag.Provide
  constructor(
    readonly environment: Env,
    readonly inner: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

export class Emit<OutElem, OutDone> extends Channel<unknown, unknown, unknown, unknown, never, OutElem, OutDone> {
  readonly _channelTag: EmitTag = ChannelTag.Emit
  constructor(readonly out: () => OutElem) {
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
  readonly _channelTag: BridgeTag = ChannelTag.Bridge
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
  | Read<Env, InErr, InElem, InDone, OutErr, any, OutElem, OutDone, any>
  | Done<OutDone>
  | Halt<OutErr>
  | Effect<Env, OutErr, OutDone>
  | Emit<OutElem, OutDone>
  | ConcatAll<Env, InErr, InElem, InDone, OutErr, any, OutElem, any, OutDone, any>
  | Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | Fold<Env, InErr, InElem, InDone, OutErr, any, OutElem, OutDone, any>
  | Provide<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | BracketOut<Env, OutErr, OutElem, OutDone>
  | Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | EffectSuspendTotal<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | EffectTotal<OutDone> {
  //
}

/**
 * Halt a channel with the specified cause
 */
export function haltWith<E>(result: () => Cause<E>): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(result)
}

/**
 * Halt a channel with the specified cause
 */
export function halt<E>(result: Cause<E>): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => result)
}

/**
 * End a channel with the specified result
 */
export function endWith<OutDone>(
  result: () => OutDone
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(result)
}

/**
 * End a channel with the specified result
 */
export function end<OutDone>(result: OutDone): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(() => result)
}

export function succeed<Z>(z: Z): Channel<unknown, unknown, unknown, unknown, never, never, Z> {
  return end(z)
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified function to the terminal value of this
 * channel.
 */
export function map_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (out: OutDone) => OutDone2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return bind_(self, (z) => succeed(f(z)))
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified function to the terminal value of this
 * channel.
 *
 * @dataFirst map_
 */
export function map<OutDone, OutDone2>(f: (out: OutDone) => OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => map_(self, f)
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 */
export function bind_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (d: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return new Fold<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone,
    OutDone2
  >(channel, new ContinuationK(f, halt))
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 *
 * @dataFirst bind_
 */
export function bind<OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(
  f: (d: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): <Env, InErr, InElem, InDone, OutErr, OutElem>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return (self) => bind_(self, f)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 */
export function zip_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  readonly [OutDone, OutDone1]
> {
  return bind_(self, (z) => map_(that, (z2) => tuple(z, z2)))
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 *
 * @dataFirst zip_
 */
export function zip<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zip_(self, that)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of this channel.
 */
export function zipl_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone
> {
  return map_(zip_(self, that), ([d]) => d)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of this channel.
 *
 * @dataFirst zipl_
 */
export function zipl<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipl_(self, that)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of the other channel.
 */
export function zipr_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1 | OutErr,
  OutElem1 | OutElem,
  OutDone1
> {
  return map_(zip_(self, that), ([, d1]) => d1)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of the other channel.
 *
 * @dataFirst zipr_
 */
export function zipr<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipr_(self, that)
}
