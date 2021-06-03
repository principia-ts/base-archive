import type { Cause } from '../../Cause'
import type { Chunk } from '../../Chunk'
import type { Exit } from '../../Exit'
import type { IO, URIO } from '../../IO'
import type { Predicate } from '../../Predicate'
import type { Channel } from './core'
import type { ChannelState } from './internal/ChannelState'
import type { AsyncInputConsumer, AsyncInputProducer } from './internal/producer'

import * as AR from '../../Array'
import * as Ca from '../../Cause'
import * as A from '../../Chunk'
import * as E from '../../Either'
import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import * as F from '../../Fiber'
import { flow, identity, pipe } from '../../function'
import * as H from '../../Hub'
import * as I from '../../IO'
import * as M from '../../Managed'
import * as RM from '../../Managed/ReleaseMap'
import * as O from '../../Option'
import * as PR from '../../Promise'
import * as Q from '../../Queue'
import * as Ref from '../../Ref'
import { tuple } from '../../tuple'
import {
  bind,
  bind_,
  BracketOut,
  Bridge,
  ConcatAll,
  ContinuationK,
  Effect,
  EffectSuspendTotal,
  EffectTotal,
  Emit,
  end,
  Ensuring,
  Fold,
  Halt,
  halt,
  map_,
  PipeTo,
  Provide,
  Read,
  succeed,
  zipr,
  zipr_
} from './core'
import { ChannelExecutor } from './internal/ChannelExecutor'
import * as State from './internal/ChannelState'
import * as MD from './internal/MergeDecision'
import * as MS from './internal/MergeState'
import { makeSingleProducerAsyncInput } from './internal/SingleProducerAsyncInput'

export function effectTotal<OutDone>(
  effect: () => OutDone
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new EffectTotal(effect)
}

export function deferTotal<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  effect: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new EffectSuspendTotal(effect)
}

/**
 * Pipe the output of a channel into the input of another
 */
export function pipeTo_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, OutErr1, OutElem1, OutDone1>(
  left: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  right: Channel<Env1, OutErr, OutElem, OutDone, OutErr1, OutElem1, OutDone1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1> {
  return new PipeTo<Env & Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutElem1, OutDone, OutDone1>(
    () => left,
    () => right
  )
}

/**
 * Pipe the output of a channel into the input of another
 *
 * @dataFirst pipeTo_
 */
export function pipeTo<OutErr, OutElem, OutDone, Env1, OutErr1, OutElem1, OutDone1>(
  right: Channel<Env1, OutErr, OutElem, OutDone, OutErr1, OutElem1, OutDone1>
): <Env, InErr, InElem, InDone>(
  left: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env & Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1> {
  return (left) => pipeTo_(left, right)
}

/**
 * Reads an input and continue exposing both full error cause and completion
 */
export function readWithCause<
  Env,
  Env1,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  inp: (i: InElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  halt: (e: Cause<InErr>) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): Channel<
  Env & Env1 & Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return new Read<
    Env & Env1 & Env2,
    InErr,
    InElem,
    InDone,
    InErr,
    OutErr | OutErr1 | OutErr2,
    OutElem | OutElem1 | OutElem2,
    InDone,
    OutDone | OutDone1 | OutDone2
  >(
    inp,
    new ContinuationK<
      Env & Env1 & Env2,
      InErr,
      InElem,
      InDone,
      InErr,
      OutErr | OutErr1 | OutErr2,
      OutElem | OutElem1 | OutElem2,
      InDone,
      OutDone | OutDone1 | OutDone2
    >(done, halt)
  )
}

/**
 * Reads an input and continue exposing both error and completion
 */
export function readWith<
  Env,
  Env1,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  inp: (i: InElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  error: (e: InErr) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): Channel<
  Env & Env1 & Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return readWithCause(inp, (c) => E.match_(Ca.failureOrCause(c), error, halt), done)
}

/**
 * Halt a channel with the specified error
 */
export function failWith<E>(error: () => E): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Ca.fail(error()))
}

/**
 * Halt a channel with the specified error
 */
export function fail<E>(error: E): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Ca.fail(error))
}

/**
 * Halt a channel with the specified exception
 */
export function die(defect: unknown): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new Halt(() => Ca.die(defect))
}

/**
 * Halt a channel with the specified exception
 */
export function dieWith(defect: () => unknown): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new Halt(() => Ca.die(defect()))
}

/**
 * Writes an output to the channel
 */
export function writeWith<OutElem>(
  out: () => OutElem
): Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(out)
}

/**
 * Writes an output to the channel
 */
export function write<OutElem>(out: OutElem): Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(() => out)
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is guaranteed to be executed
 * so long as the channel begins execution (and regardless of whether or not it completes).
 */
export function ensuringWith_<Env, Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: (e: Exit<OutErr, OutDone>) => IO<Env2, never, unknown>
): Channel<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Ensuring<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(channel, finalizer)
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is guaranteed to be executed
 * so long as the channel begins execution (and regardless of whether or not it completes).
 *
 * @dataFirst ensuringWith_
 */
export function ensuringWith<Env2, OutErr, OutDone>(
  finalizer: (e: Exit<OutErr, OutDone>) => IO<Env2, never, unknown>
): <Env, InErr, InElem, InDone, OutElem>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (channel) => ensuringWith_(channel, finalizer)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel. The provided merging function
 * is used to merge the terminal values of all channels into the single terminal value of the
 * returned channel.
 */
export function concatMapWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, OutDone3> {
  return new ConcatAll<
    Env & Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    OutElem,
    OutElem2,
    OutDone,
    OutDone2,
    OutDone3
  >(g, h, self, f)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel. The provided merging function
 * is used to merge the terminal values of all channels into the single terminal value of the
 * returned channel.
 *
 * @dataFirst concatMapWith_
 */
export function concatMapWith<OutDone, OutElem, Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2, OutDone3>(
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): <Env, InErr, InElem, InDone, OutErr>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
) => Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, OutDone3> {
  return (self) => concatMapWith_(self, f, g, h)
}

/**
 * Concat sequentially a channel of channels
 */
export function concatAllWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone2
  >,
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem, OutDone3> {
  return new ConcatAll<
    Env & Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutElem,
    OutDone,
    OutDone2,
    OutDone3
  >(f, g, channels, identity)
}

/**
 * Concat sequentially a channel of channels
 *
 * @dataFirst concatAllWith_
 */
export function concatAllWith<OutDone, OutDone2, OutDone3>(
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): <Env, InErr, InElem, InDone, OutErr, OutElem, Env2, InErr2, InElem2, InDone2, OutErr2>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone2
  >
) => Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem, OutDone3> {
  return (channels) => concatAllWith_(channels, f, g)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 */
export function concatMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, unknown> {
  return concatMapWith_(
    self,
    f,
    () => void 0,
    () => void 0
  )
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 *
 * @dataFirst concatMap_
 */
export function concatMap<OutElem, OutElem2, OutDone, Env2, InErr2, InElem2, InDone2, OutErr2>(
  f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): <Env, InErr, InElem, InDone, OutErr, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
) => Channel<Env & Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem2, unknown> {
  return (self) => concatMap_(self, f)
}

/**
 * Fold the channel exposing success and full error cause
 */
export function foldCauseM_<
  Env,
  Env1,
  Env2,
  InErr,
  InErr1,
  InErr2,
  InElem,
  InElem1,
  InElem2,
  InDone,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onError: (c: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSuccess: (o: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
): Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr3,
  OutElem | OutElem1 | OutElem2,
  OutDone2 | OutDone3
> {
  return new Fold<
    Env & Env1 & Env2,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr,
    OutErr2 | OutErr3,
    OutElem | OutElem1 | OutElem2,
    OutDone,
    OutDone2 | OutDone3
  >(
    channel,
    new ContinuationK<
      Env & Env1 & Env2,
      InErr & InErr1 & InErr2,
      InElem & InElem1 & InElem2,
      InDone & InDone1 & InDone2,
      OutErr,
      OutErr2 | OutErr3,
      OutElem | OutElem1 | OutElem2,
      OutDone,
      OutDone2 | OutDone3
    >(onSuccess, onError)
  )
}

/**
 * Fold the channel exposing success and full error cause
 *
 * @dataFirst foldCauseM_
 */
export function foldCauseM<
  Env1,
  Env2,
  InErr1,
  InErr2,
  InElem1,
  InElem2,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  onErr: (c: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSucc: (o: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
): <Env, InErr, InElem, InDone, OutElem>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr3,
  OutElem | OutElem1 | OutElem2,
  OutDone2 | OutDone3
> {
  return (self) => foldCauseM_(self, onErr, onSucc)
}

/**
 * Embed inputs from continuos pulling of a producer
 */
export function embedInput_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>,
  input: AsyncInputProducer<InErr, InElem, InDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Bridge(input, self)
}

/**
 * Embed inputs from continuos pulling of a producer
 *
 * @dataFirst embedInput_
 */
export function embedInput<InErr, InElem, InDone>(
  input: AsyncInputProducer<InErr, InElem, InDone>
): <Env, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (self) => embedInput_(self, input)
}

/**
 * Construct a resource Channel with Acquire / Release
 */
export function bracketOutExit_<R, R2, E, Z>(
  self: IO<R, E, Z>,
  release: (z: Z, e: Exit<unknown, unknown>) => URIO<R2, unknown>
): Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return new BracketOut<R & R2, E, Z, void>(self, release)
}

/**
 * Construct a resource Channel with Acquire / Release
 *
 * @dataFirst bracketOutExit_
 */
export function bracketOutExit<R2, Z>(
  release: (z: Z, e: Exit<unknown, unknown>) => URIO<R2, unknown>
): <R, E>(self: IO<R, E, Z>) => Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return (self) => bracketOutExit_(self, release)
}

/**
 * Provides the channel with its required environment, which eliminates
 * its dependency on `Env`.
 */
export function provideAll_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  env: Env
): Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Provide(env, self)
}

/**
 * Provides the channel with its required environment, which eliminates
 * its dependency on `Env`.
 *
 * @dataFirst provideAll_
 */
export function provideAll<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  env: Env
): (
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (self) => provideAll_(self, env)
}

/**
 * Returns a new channel which reads all the elements from upstream's output channel
 * and ignores them, then terminates with the upstream result value.
 */
export function drain<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone> {
  const drainer: Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> = readWithCause(
    (_) => drainer,
    halt,
    end
  )
  return channel['>>>'](drainer)
}

/**
 * Use an effect to end a channel
 */
export function fromEffect<R, E, A>(io: IO<R, E, A>): Channel<R, unknown, unknown, unknown, E, never, A> {
  return new Effect(io)
}

/**
 * Use a managed to emit an output element
 */
export function managedOut<R, E, A>(managed: M.Managed<R, E, A>): Channel<R, unknown, unknown, unknown, E, A, unknown> {
  return concatMap_(
    bracketOutExit_(RM.make, (rm, ex) => M.releaseAll_(rm, ex, sequential)),
    (rm) =>
      pipe(
        managed.io,
        I.gives((r: R) => tuple(r, rm)),
        I.map(([, a]) => a),
        fromEffect,
        bind(write)
      )
  )
}

/**
 * Returns a new channel, which flattens the terminal value of this channel. This function may
 * only be called if the terminal value of this channel is another channel of compatible types.
 */
export function flatten<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  self: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  >
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return bind_(self, identity)
}

/**
 * Makes a channel from an effect that returns a channel in case of success
 */
export function unwrap<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: IO<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return flatten(fromEffect(self))
}

/**
 * Makes a channel from a managed that returns a channel in case of success
 */
export function unwrapManaged<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: M.Managed<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return concatAllWith_(managedOut(self), identity, identity)
}

/**
 * Unit channel
 */
export function unit(): Channel<unknown, unknown, unknown, unknown, never, never, void> {
  return end(void 0)
}

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 */
export function as_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  z2: OutDone2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return map_(self, (_) => z2)
}

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 *
 * @dataFirst as_
 */
export function as<OutDone2>(z2: OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => as_(self, z2)
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 */
export function catchAll_<
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
  f: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return catchAllCause_(self, (cause) =>
    E.match_(
      Ca.failureOrCause(cause),
      (l) => f(l),
      (r) => halt(r)
    )
  )
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 *
 * @dataFirst catchAll_
 */
export function catchAll<Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
  f: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => catchAll_(self, f)
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 */
export function catchAllCause_<
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
  f: (cause: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return new Fold<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1,
    OutDone | OutDone1
  >(self, new ContinuationK((_) => end(_), f))
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 *
 * @dataFirst catchAllCause_
 */
export function catchAllCause<Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
  f: (cause: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => catchAllCause_(self, f)
}

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 */
export function collect_<Env, InErr, InElem, InDone, OutErr, OutElem, OutElem2, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => O.Option<OutElem2>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const collector: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = readWith(
    (o) =>
      O.match_(
        f(o),
        () => collector,
        (out2) => zipr_(write(out2), collector)
      ),
    (e) => fail(e),
    (z) => end(z)
  )

  return pipeTo_(self, collector)
}

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 *
 * @dataFirst collect_
 */
export function collect<OutElem, OutElem2>(f: (o: OutElem) => O.Option<OutElem2>) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => collect_(self, f)
}

/**
 * Returns a new channel, which is the concatenation of all the channels that are written out by
 * this channel. This method may only be called on channels that output other channels.
 */
export function concatOut<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return concatAll(mapOut_(self, (out) => out))
}

function contramapReader<InErr, InElem, InDone0, InDone>(
  f: (a: InDone0) => InDone
): Channel<unknown, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return readWith(
    (_in) => zipr_(write(_in), contramapReader(f)),
    (err) => fail(err),
    (done) => end(f(done))
  )
}

export function contramap_<Env, InErr, InElem, InDone0, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InDone0) => InDone
): Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapReader(f), self)
}

/**
 * @dataFirst contramap_
 */
export function contramap<InDone, InDone0>(f: (a: InDone0) => InDone) {
  return <Env, InErr, InElem, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramap_(self, f)
}

function contramapInReader<InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => InElem
): Channel<unknown, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return readWith(
    (_in) => zipr_(write(f(_in)), contramapInReader(f)),
    (err) => fail(err),
    (done) => end(done)
  )
}

export function contramapIn_<Env, InErr, InElem0, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => InElem
): Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapInReader(f), self)
}

/**
 * @dataFirst contramapIn_
 */
export function contramapIn<InElem0, InElem>(f: (a: InElem0) => InElem) {
  return <Env, InErr, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapIn_(self, f)
}

function contramapMReader<Env1, InErr, InElem, InDone0, InDone>(
  f: (i: InDone0) => IO<Env1, InErr, InDone>
): Channel<Env1, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return readWith(
    (_in) => zipr_(write(_in), contramapMReader(f)),
    (err) => fail(err),
    (done0) => fromEffect(f(done0))
  )
}

export function contramapM_<Env, Env1, InErr, InElem, InDone0, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (i: InDone0) => IO<Env1, InErr, InDone>
): Channel<Env1 & Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapMReader(f), self)
}

/**
 * @dataFirst contramapM_
 */
export function contramapM<Env1, InErr, InDone0, InDone>(f: (i: InDone0) => IO<Env1, InErr, InDone>) {
  return <Env, InElem, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) =>
    contramapM_(self, f)
}

function contramapInMReader<Env1, InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => IO<Env1, InErr, InElem>
): Channel<Env1, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return readWith(
    (_in) =>
      zipr_(
        bind_(fromEffect(f(_in)), (_) => write(_)),
        contramapInMReader(f)
      ),
    (err) => fail(err),
    (done) => end(done)
  )
}

export function contramapInM_<Env, Env1, InErr, InElem0, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => IO<Env1, InErr, InElem>
): Channel<Env1 & Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return pipeTo_(contramapInMReader(f), self)
}

/**
 * @dataFirst contramapInM_
 */
export function contramapInM<Env1, InErr, InElem0, InElem>(f: (a: InElem0) => IO<Env1, InErr, InElem>) {
  return <Env, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) =>
    contramapInM_(self, f)
}

function doneCollectReader<Env, OutErr, OutElem, OutDone>(
  builder: A.ChunkBuilder<OutElem>
): Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> {
  return readWith(
    (out) =>
      zipr_(
        fromEffect(
          I.effectTotal(() => {
            builder.append(out)
          })
        ),
        doneCollectReader(builder)
      ),
    (err) => fail(err),
    (done) => end(done)
  )
}

/**
 * Returns a new channel, which is the same as this one, except that all the outputs are
 * collected and bundled into a tuple together with the terminal value of this channel.
 *
 * As the channel returned from this channel collect's all of this channel's output into an in-
 * memory chunk, it is not safe to call this method on channels that output a large or unbounded
 * number of values.
 */
export function doneCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, never, readonly [A.Chunk<OutElem>, OutDone]> {
  return unwrap(
    I.effectTotal(() => {
      const builder = A.builder<OutElem>()

      return mapM_(pipeTo_(self, doneCollectReader(builder)), (z) => I.succeed(tuple(builder.result(), z)))
    })
  )
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 */
export function interruptWhen_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, OutDone1>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  io: IO<Env1, OutErr1, OutDone1>
): Channel<Env1 & Env, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone | OutDone1> {
  return mergeWith_(
    self,
    fromEffect(io),
    (selfDone) => MD.done(I.done(selfDone)),
    (ioDone) => MD.done(I.done(ioDone))
  )
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 *
 * @dataFirst interruptWhen_
 */
export function interruptWhen<Env1, OutErr1, OutDone1>(io: IO<Env1, OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => interruptWhen_(self, io)
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified promise is completed. If the promise is completed before the underlying channel is
 * done, then the returned channel will yield the value of the promise. Otherwise, if the
 * underlying channel finishes first, then the returned channel will yield the value of the
 * underlying channel.
 */
export function interruptWhenP_<Env, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, OutDone1>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  promise: PR.Promise<OutErr1, OutDone1>
): Channel<Env, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone | OutDone1> {
  return interruptWhen_(self, PR.await(promise))
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified promise is completed. If the promise is completed before the underlying channel is
 * done, then the returned channel will yield the value of the promise. Otherwise, if the
 * underlying channel finishes first, then the returned channel will yield the value of the
 * underlying channel.
 *
 * @dataFirst interruptWhenP_
 */
export function interruptWhenP<OutErr1, OutDone1>(promise: PR.Promise<OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => interruptWhenP_(self, promise)
}

/**
 * Returns a new channel that collects the output and terminal value of this channel, which it
 * then writes as output of the returned channel.
 */
export function emitCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, readonly [A.Chunk<OutElem>, OutDone], void> {
  return bind_(doneCollect(self), (t) => write(t))
}

export function ensuring_<Env, Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone, Z>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: URIO<Env1, Z>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return ensuringWith_(self, (_) => finalizer)
}

/**
 * @dataFirst ensuring_
 */
export function ensuring<Env1, Z>(finalizer: URIO<Env1, Z>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => ensuring_(self, finalizer)
}

export function foldM_<
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
  OutDone1,
  OutErr2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onError: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSuccess: (done: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone1>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1 | OutErr2,
  OutElem | OutElem1,
  OutDone1
> {
  return foldCauseM_(
    self,
    (_) => {
      return E.match_(
        Ca.failureOrCause(_),
        (err) => onError(err),
        (cause) => halt(cause)
      )
    },
    onSuccess
  )
}

/**
 * @dataFirst foldM_
 */
export function foldM<Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone, OutDone1, OutErr2>(
  onFailure: (oErr: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSuccess: (oErr: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) =>
    foldM_(self, onFailure, onSuccess)
}

/**
 * Returns a new channel that will perform the operations of this one, until failure, and then
 * it will switch over to the operations of the specified fallback channel.
 */
export function orElse_<
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
  OutDone | OutDone1
> {
  return catchAll_(self, (_) => that)
}

/**
 * Returns a new channel that will perform the operations of this one, until failure, and then
 * it will switch over to the operations of the specified fallback channel.
 *
 * @dataFirst orElse_
 */
export function orElse<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orElse_(self, that)
}

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 */
export function mapError_<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (err: OutErr) => OutErr2
): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return mapErrorCause_(self, (cause) => Ca.map_(cause, f))
}

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 *
 * @dataFirst mapError_
 */
export function mapError<OutErr, OutErr2>(f: (err: OutErr) => OutErr2) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapError_(self, f)
}

/**
 * A more powerful version of `mapError` which also surfaces the `Cause` of the channel failure
 */
export function mapErrorCause_<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (cause: Cause<OutErr>) => Cause<OutErr2>
): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return catchAllCause_(self, (cause) => halt(f(cause)))
}

/**
 * A more powerful version of `mapError` which also surfaces the `Cause` of the channel failure
 *
 * @dataFirst mapErrorCause_
 */
export function mapErrorCause<OutErr, OutErr2>(f: (cause: Cause<OutErr>) => Cause<OutErr2>) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapErrorCause_(self, f)
}

function runManagedInterpret<Env, InErr, InDone, OutErr, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): IO<Env, OutErr, OutDone> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    State.concrete(channelState)
    switch (channelState._tag) {
      case State.ChannelStateTag.Effect: {
        return I.bind_(channelState.effect, () => runManagedInterpret(exec.run(), exec))
      }
      case State.ChannelStateTag.Emit: {
        // eslint-disable-next-line no-param-reassign
        channelState = exec.run()
        break
      }
      case State.ChannelStateTag.Done: {
        return I.done(exec.getDone())
      }
    }
  }
  throw new Error('Bug')
}

function toPullInterpret<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): IO<Env, E.Either<OutErr, OutDone>, OutElem> {
  State.concrete(channelState)
  switch (channelState._tag) {
    case State.ChannelStateTag.Effect: {
      return I.bind_(I.mapError_(channelState.effect, E.left), () => toPullInterpret(exec.run(), exec))
    }
    case State.ChannelStateTag.Emit: {
      return I.succeed(exec.getEmit())
    }
    case State.ChannelStateTag.Done: {
      const done = exec.getDone()
      return Ex.matchM_(done, flow(Ca.map(E.left), I.halt), flow(E.right, I.fail))
    }
  }
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified effectful function to the terminal value
 * of this channel.
 */
export function mapM_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, OutDone1>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutDone) => IO<Env1, OutErr1, OutDone1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone1> {
  return bind_(self, (z) => fromEffect(f(z)))
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified effectful function to the terminal value
 * of this channel.
 *
 * @dataFirst mapM_
 */
export function mapM<Env1, OutErr1, OutDone, OutDone1>(f: (o: OutDone) => IO<Env1, OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapM_(self, f)
}

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 */
export function mergeWith_<
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
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (ex: Ex.Exit<OutErr, OutDone>) => MD.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (ex: Ex.Exit<OutErr1, OutDone1>) => MD.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
): Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr2 | OutErr3,
  OutElem | OutElem1,
  OutDone2 | OutDone3
> {
  return pipe(
    M.do,
    M.bindS('input', () =>
      I.toManaged_(makeSingleProducerAsyncInput<InErr & InErr1, InElem & InElem1, InDone & InDone1>())
    ),
    M.letS('queueReader', ({ input }) => fromInput(input)),
    M.bindS('pullL', ({ queueReader }) => toPull(queueReader['>>>'](self))),
    M.bindS('pullR', ({ queueReader }) => toPull(queueReader['>>>'](that))),
    M.map(({ input, pullL, pullR }) => {
      type MergeState = MS.MergeState<
        Env & Env1,
        OutErr,
        OutErr1,
        OutErr2 | OutErr3,
        OutElem | OutElem1,
        OutDone,
        OutDone1,
        OutDone2 | OutDone3
      >
      const handleSide =
        <Err, Done, Err2, Done2>(
          exit: Ex.Exit<E.Either<Err, Done>, OutElem | OutElem1>,
          fiber: F.Fiber<E.Either<Err2, Done2>, OutElem | OutElem1>,
          pull: IO<Env & Env1, E.Either<Err, Done>, OutElem | OutElem1>
        ) =>
        (
          done: (
            ex: Ex.Exit<Err, Done>
          ) => MD.MergeDecision<Env & Env1, Err2, Done2, OutErr2 | OutErr3, OutDone2 | OutDone3>,
          both: (
            f1: F.Fiber<E.Either<Err, Done>, OutElem | OutElem1>,
            f2: F.Fiber<E.Either<Err2, Done2>, OutElem | OutElem1>
          ) => MergeState,
          single: (
            f: (ex: Ex.Exit<Err2, Done2>) => IO<Env & Env1, OutErr2 | OutErr3, OutDone2 | OutDone3>
          ) => MergeState
        ): IO<
          Env & Env1,
          never,
          Channel<Env & Env1, unknown, unknown, unknown, OutErr2 | OutErr3, OutElem | OutElem1, OutDone2 | OutDone3>
        > =>
          Ex.match_(
            exit,
            (cause) => {
              const result = pipe(Ca.flipCauseEither(cause), E.match(Ex.halt, Ex.succeed), done)

              MD.concrete(result)

              switch (result._tag) {
                case MD.MergeDecisionTag.Done: {
                  return pipe(F.interrupt(fiber)['*>'](result.io), fromEffect, I.succeed)
                }
                case MD.MergeDecisionTag.Await: {
                  return pipe(
                    fiber.await,
                    I.map(
                      Ex.match(
                        flow(Ca.flipCauseEither, E.match(Ex.halt, Ex.succeed), result.f, fromEffect),
                        flow(write, zipr(go(single(result.f))))
                      )
                    )
                  )
                }
              }
            },
            (elem) => I.fork(pull)['<$>']((leftFiber) => write(elem)['*>'](go(both(leftFiber, fiber))))
          )

      const go = (
        state: MergeState
      ): Channel<Env & Env1, unknown, unknown, unknown, OutErr2 | OutErr3, OutElem | OutElem1, OutDone2 | OutDone3> => {
        switch (state._tag) {
          case MS.MergeStateTag.BothRunning: {
            const lj: IO<Env1, E.Either<OutErr, OutDone>, OutElem | OutElem1>   = F.join(state.left)
            const rj: IO<Env1, E.Either<OutErr1, OutDone1>, OutElem | OutElem1> = F.join(state.right)

            return unwrap(
              I.raceWith_(
                lj,
                rj,
                (leftEx, _) =>
                  handleSide(leftEx, state.right, pullL)(
                    leftDone,
                    (l, r) => new MS.BothRunning(l, r),
                    (_) => new MS.LeftDone(_)
                  ),
                (rightEx, _) =>
                  handleSide(rightEx, state.left, pullR)(
                    rightDone,
                    (l, r) => new MS.BothRunning(r, l),
                    (_) => new MS.RightDone(_)
                  )
              )
            )
          }
          case MS.MergeStateTag.LeftDone: {
            return pipe(
              I.result(pullR),
              I.map(
                Ex.match(
                  flow(Ca.flipCauseEither, E.match(Ex.halt, Ex.succeed), state.f, fromEffect),
                  flow(write, zipr(go(new MS.LeftDone(state.f))))
                )
              ),
              unwrap
            )
          }
          case MS.MergeStateTag.RightDone: {
            return pipe(
              I.result(pullL),
              I.map(
                Ex.match(
                  flow(Ca.flipCauseEither, E.match(Ex.halt, Ex.succeed), state.f, fromEffect),
                  flow(write, zipr(go(new MS.RightDone(state.f))))
                )
              ),
              unwrap
            )
          }
        }
      }

      return pipe(
        I.fork(pullL),
        I.crossWith(
          I.fork(pullR),
          (a, b): MergeState =>
            new MS.BothRunning<unknown, OutErr, OutErr1, unknown, OutElem | OutElem1, OutDone, OutDone1, unknown>(a, b)
        ),
        fromEffect,
        bind(go),
        embedInput(input)
      )
    }),
    unwrapManaged
  )
}

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 *
 * @dataFirst mergeWith_
 */
export function mergeWith<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutErr2,
  OutErr3,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (ex: Ex.Exit<OutErr, OutDone>) => MD.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (ex: Ex.Exit<OutErr1, OutDone1>) => MD.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
) {
  return <Env, InErr, InElem, InDone, OutElem>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) =>
    mergeWith_(self, that, leftDone, rightDone)
}

/**
 * Maps the output of this channel using f
 */
export function mapOut_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutElem2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => OutElem2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const reader: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = readWithCause(
    flow(
      f,
      write,
      bind(() => reader)
    ),
    halt,
    end
  )

  return self['>>>'](reader)
}

/**
 * Maps the output of this channel using f
 *
 * @dataFirst mapOut_
 */
export function mapOut<OutElem, OutElem2>(
  f: (o: OutElem) => OutElem2
): <Env, InErr, InElem, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  return (self) => mapOut_(self, f)
}

const mapOutMReader = <Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(
  f: (o: OutElem) => IO<Env1, OutErr1, OutElem1>
): Channel<Env & Env1, OutErr, OutElem, OutDone, OutErr | OutErr1, OutElem1, OutDone> =>
  readWith(
    (out) => bind_(fromEffect(f(out)), (_) => zipr_(write(_), mapOutMReader(f))),
    (e) => fail(e),
    (z) => end(z)
  )

export function mapOutM_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutElem1, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => IO<Env1, OutErr1, OutElem1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return pipeTo_(self, mapOutMReader(f))
}

/**
 * @dataFirst mapOutM_
 */
export function mapOutM<Env1, OutErr1, OutElem, OutElem1>(f: (o: OutElem) => IO<Env1, OutErr1, OutElem1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapOutM_(self, f)
}

export const never: Channel<unknown, unknown, unknown, unknown, never, never, never> = fromEffect(I.never)

export function orDie_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  err: E
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return orDieWith_(self, (_) => err)
}

/**
 * @dataFirst orDie_
 */
export function orDie<E>(err: E) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDie_(self, err)
}

export function orDieWith_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (e: OutErr) => E
) {
  return catchAll_(self, (e) => die(f(e)))
}

/**
 * @dataFirst orDieWith_
 */
export function orDieWith<OutErr, E>(f: (e: OutErr) => E) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDieWith_(self, f)
}

/**
 * Repeats this channel forever
 */
export function repeated<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return bind_(self, () => repeated(self))
}

/**
 * Runs a channel until the end is received
 */
export function runManaged<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): M.Managed<Env, OutErr, OutDone> {
  return M.mapM_(
    M.makeExit_(
      I.effectTotal(() => new ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || I.unit()
    ),
    (exec) => I.deferTotal(() => runManagedInterpret(exec.run(), exec))
  )
}

/**
 * Runs a channel until the end is received
 */
export function run<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): IO<Env, OutErr, OutDone> {
  return M.useNow(runManaged(self))
}

export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): IO<Env, OutErr, readonly [A.Chunk<OutElem>, OutDone]> {
  return run(doneCollect(self))
}

/**
 * Runs a channel until the end is received
 */
export function runDrain<Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): IO<Env, OutErr, OutDone> {
  return run(drain(self))
}

export function asUnit<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return as_(self, undefined)
}

/**
 * Interpret a channel to a managed Pull
 */
export function toPull<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): M.Managed<Env, never, IO<Env, E.Either<OutErr, OutDone>, OutElem>> {
  return M.map_(
    M.makeExit_(
      I.effectTotal(() => new ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || I.unit()
    ),
    (exec) => I.deferTotal(() => toPullInterpret(exec.run(), exec))
  )
}

export function zipPar_<
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
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  readonly [OutDone, OutDone1]
> {
  return mergeWith_(
    self,
    that,
    (exit1) => MD.await((exit2) => I.done(Ex.cross_(exit1, exit2))),
    (exit2) => MD.await((exit1) => I.done(Ex.cross_(exit1, exit2)))
  )
}

/**
 * @dataFirst zipPar_
 */
export function zipPar<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipPar_(self, that)
}

export function zipParLeft_<
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
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone
> {
  return map_(zipPar_(self, that), ([d]) => d)
}

/**
 * @dataFirst zipParLeft_
 */
export function zipParLeft<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipParLeft_(self, that)
}

export function zipParRight_<
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
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone1
> {
  return map_(zipPar_(self, that), ([, d1]) => d1)
}

/**
 * @dataFirst zipParRight_
 */
export function zipParRight<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipParRight_(self, that)
}

export function bracketOut_<Env, OutErr, Acquired, Z>(
  acquire: IO<Env, OutErr, Acquired>,
  release: (a: Acquired) => URIO<Env, Z>
): Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return bracketOutExit_(acquire, (z, _) => release(z))
}

/**
 * @dataFirst bracketOut_
 */
export function bracketOut<Env, Acquired, Z>(release: (a: Acquired) => URIO<Env, Z>) {
  return <OutErr>(acquire: IO<Env, OutErr, Acquired>) => bracketOut_(acquire, release)
}

export function bracket_<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  acquire: IO<Env, OutErr, Acquired>,
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => URIO<Env, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return bracketExit_(acquire, use, (a, _) => release(a))
}

/**
 * @dataFirst bracket_
 */
export function bracket<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => URIO<Env, any>
) {
  return (acquire: IO<Env, OutErr, Acquired>) => bracket_(acquire, use, release)
}

export function bracketExit_<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  acquire: IO<Env, OutErr, Acquired>,
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => URIO<Env, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return pipe(
    fromEffect(Ref.ref<(exit: Ex.Exit<OutErr, OutDone>) => URIO<Env, any>>((_) => I.unit())),
    bind((ref) =>
      pipe(
        fromEffect(I.makeUninterruptible(I.tap_(acquire, (a) => ref.set((_) => release(a, _))))),
        bind(use),
        ensuringWith((ex) => I.bind_(ref.get, (_) => _(ex)))
      )
    )
  )
}

/**
 * @dataFirst bracketExit_
 */
export function bracketExit<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => URIO<Env, any>
) {
  return (acquire: IO<Env, OutErr, Acquired>) => bracketExit_(acquire, use, release)
}

/**
 * Creates a channel backed by a buffer. When the buffer is empty, the channel will simply
 * passthrough its input as output. However, when the buffer is non-empty, the value inside
 * the buffer will be passed along as output.
 */
export function buffer<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref.URef<InElem>
): Channel<unknown, InErr, InElem, InDone, InErr, InElem, InDone> {
  return unwrap(
    Ref.modify_(ref, (v) => {
      if (isEmpty(v)) {
        return tuple(
          readWith(
            (_in) => zipr_(write(_in), buffer(empty, isEmpty, ref)),
            (err) => fail(err),
            (done) => end(done)
          ),
          v
        )
      } else {
        return tuple(zipr_(write(v), buffer(empty, isEmpty, ref)), empty)
      }
    })
  )
}

export function bufferChunk<InElem, InErr, InDone>(
  ref: Ref.URef<A.Chunk<InElem>>
): Channel<unknown, InErr, A.Chunk<InElem>, InDone, InErr, A.Chunk<InElem>, InDone> {
  return buffer<A.Chunk<InElem>, InErr, InDone>(A.empty<InElem>(), (_) => A.isEmpty(_), ref)
}

export function concatAll<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return concatAllWith_(
    channels,
    (_, __) => void 0,
    (_, __) => void 0
  )
}

export function fromEither<E, A>(either: E.Either<E, A>): Channel<unknown, unknown, unknown, unknown, E, never, A> {
  return E.match_(either, fail, succeed)
}

export function fromOption<A>(option: O.Option<A>): Channel<unknown, unknown, unknown, unknown, O.None, never, A> {
  return O.match_(
    option,
    () => fail(O.none() as O.None),
    (_) => succeed(_)
  )
}

export function id<Err, Elem, Done>(): Channel<unknown, Err, Elem, Done, Err, Elem, Done> {
  return readWith(
    (_in) => zipr_(write(_in), id<Err, Elem, Done>()),
    (err) => fail(err),
    (done) => end(done)
  )
}

export function interrupt(fiberId: F.FiberId): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return halt(Ca.interrupt(fiberId))
}

export function managed_<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, A>(
  m: M.Managed<Env, OutErr, A>,
  use: (a: A) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone> {
  return bracket_(
    RM.make,
    (releaseMap) => {
      return pipe(
        fromEffect<Env, OutErr, A>(
          pipe(
            m.io,
            I.gives((_: Env) => tuple(_, releaseMap)),
            I.map(([, a]) => a)
          )
        ),
        bind(use)
      )
    },
    (_) =>
      M.releaseAll_(
        _,
        Ex.unit(), // FIXME: BracketOut should be BracketOutExit (From ZIO)
        sequential
      )
  )
}

/**
 * @dataFirst managed_
 */
export function managed<Env, Env1, InErr, InElem, InDone, OutErr, OutErr1, OutElem, OutDone, A>(
  use: (a: A) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
) {
  return (m: M.Managed<Env, OutErr, A>) => managed_(m, use)
}

export function readOrFail<In, E>(e: E): Channel<unknown, unknown, In, unknown, E, never, In> {
  return new Read<unknown, unknown, In, unknown, never, E, never, never, In>(
    (in_) => end(in_),
    new ContinuationK(
      (_) => fail(e),
      (_) => fail(e)
    )
  )
}

export function read<In>(): Channel<unknown, unknown, In, unknown, O.None, never, In> {
  return readOrFail(O.none() as O.None)
}

export function fromHub<Err, Done, Elem>(hub: H.UHub<Ex.Exit<E.Either<Err, Done>, Elem>>) {
  return managed_(H.subscribe(hub), fromQueue)
}

export function fromInput<Err, Elem, Done>(
  input: AsyncInputConsumer<Err, Elem, Done>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return unwrap(
    input.takeWith(
      (_) => halt(_),
      (_) => zipr_(write(_), fromInput(input)),
      (_) => end(_)
    )
  )
}

export function fromQueue<Err, Elem, Done>(
  queue: Q.Dequeue<Ex.Exit<E.Either<Err, Done>, Elem>>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return bind_(
    fromEffect(Q.take(queue)),
    Ex.match(
      (cause) =>
        E.match_(
          Ca.flipCauseEither(cause),
          (cause) => halt(cause),
          (done) => end(done)
        ),
      (elem) => zipr_(write(elem), fromQueue(queue))
    )
  )
}

export function toHub<Err, Done, Elem>(hub: H.UHub<Ex.Exit<E.Either<Err, Done>, Elem>>) {
  return toQueue(H.toQueue(hub))
}

export function toQueue<Err, Done, Elem>(
  queue: Q.Enqueue<Ex.Exit<E.Either<Err, Done>, Elem>>
): Channel<unknown, Err, Elem, Done, never, never, any> {
  return readWithCause(
    (in_: Elem) => zipr_(fromEffect(Q.offer_(queue, Ex.succeed(in_))), toQueue(queue)),
    (cause: Ca.Cause<Err>) => fromEffect(Q.offer_(queue, Ex.halt(Ca.map_(cause, (_) => E.left(_))))),
    (done: Done) => fromEffect(Q.offer_(queue, Ex.fail(E.right(done))))
  )
}

export function writeAll<Out>(
  ...outs: ReadonlyArray<Out>
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return AR.foldr_(
    outs,
    end(undefined) as Channel<unknown, unknown, unknown, unknown, never, Out, void>,
    (out, conduit) => zipr_(write(out), conduit)
  )
}

function writeChunkWriter<Out>(
  outs: Chunk<Out>,
  idx: number,
  len: number
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  if (idx === len) return unit()
  return write(A.unsafeGet_(outs, idx))['*>'](writeChunkWriter(outs, idx + 1, len))
}

export function writeChunk<Out>(outs: Chunk<Out>): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return writeChunkWriter(outs, 0, outs.length)
}
