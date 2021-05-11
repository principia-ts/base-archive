import * as C from '../../Chunk'
import { flow, pipe } from '../../function'
import * as I from '../../IO'
import * as Ch from '../Channel'

/**
 * Sink is a data type that represent a channel that reads elements
 * of type `In`, handles input errors of type `InErr`, emits errors
 * of type `OutErr`, emits outputs of type `L` and ends with a value
 * of type `Z`.
 */
export class Sink<R, InErr, In, OutErr, L, Z> {
  constructor(readonly channel: Ch.Channel<R, InErr, C.Chunk<In>, unknown, OutErr, C.Chunk<L>, Z>) {}
}

/**
 * Transforms this sink's input elements.
 */
export function contramap_<R, InErr, In, OutErr, L, Z, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (_: In1) => In
): Sink<R, InErr, In1, OutErr, L, Z> {
  return contramapChunks_(sink, C.map(f))
}

/**
 * Transforms this sink's input elements.
 */
export function contramap<In, In1>(
  f: (_: In1) => In
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R, InErr, In1, OutErr, L, Z> {
  return (sink) => contramap_(sink, f)
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM_<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (_: In1) => I.IO<R1, InErr1, In>
): Sink<R & R1, InErr | InErr1, In1, OutErr, L, Z> {
  return contramapChunksM_(sink, C.mapM(f))
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM<In, R1, InErr1, In1>(
  f: (_: In1) => I.IO<R1, InErr1, In>
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R & R1, InErr | InErr1, In1, OutErr, L, Z> {
  return (sink) => contramapM_(sink, f)
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, InErr, In, OutErr, L, Z, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (chunk: C.Chunk<In1>) => C.Chunk<In>
): Sink<R, InErr, In1, OutErr, L, Z> {
  const loop: Ch.Channel<R, InErr, C.Chunk<In1>, unknown, InErr, C.Chunk<In>, unknown> = Ch.readWith(
    (chunk) => Ch.write(f(chunk))['*>'](loop),
    Ch.fail,
    Ch.succeed
  )
  return new Sink(loop['>>>'](sink.channel))
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks<In, In1>(
  f: (chunk: C.Chunk<In1>) => C.Chunk<In>
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R, InErr, In1, OutErr, L, Z> {
  return (sink) => contramapChunks_(sink, f)
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM_<R, InErr, In, OutErr, L, Z, R1, InErr1, In1>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (chunk: C.Chunk<In1>) => I.IO<R1, InErr1, C.Chunk<In>>
): Sink<R & R1, InErr | InErr1, In1, OutErr, L, Z> {
  const loop: Ch.Channel<
    R & R1,
    InErr | InErr1,
    C.Chunk<In1>,
    unknown,
    InErr | InErr1,
    C.Chunk<In>,
    unknown
  > = Ch.readWith((chunk) => Ch.fromEffect(f(chunk))['>>='](Ch.write)['*>'](loop), Ch.fail, Ch.succeed)
  return new Sink(
    loop['>>>'](sink.channel as Ch.Channel<R, InErr | InErr1, C.Chunk<In>, unknown, OutErr, C.Chunk<L>, Z>)
  )
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM<In, R1, InErr1, In1>(
  f: (chunk: C.Chunk<In1>) => I.IO<R1, InErr1, C.Chunk<In>>
): <R, InErr, OutErr, L, Z>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R & R1, InErr | InErr1, In1, OutErr, L, Z> {
  return (sink) => contramapChunksM_(sink, f)
}

function collectLoop<Err, A>(
  state: C.Chunk<A>
): Ch.Channel<unknown, Err, C.Chunk<A>, unknown, Err, C.Chunk<never>, C.Chunk<A>> {
  return Ch.readWithCause(
    (i) => collectLoop(state['++'](i)),
    Ch.halt,
    (_) => Ch.end(state)
  )
}

/**
 * A sink that collects all of its inputs into a chunk.
 */
export function collectAll<Err, A>() {
  return new Sink(collectLoop<Err, A>(C.empty()))
}

/**
 * A sink that ignores all of its inputs.
 */
export function drain<Err, A>() {
  const drain: Ch.Channel<unknown, Err, C.Chunk<A>, unknown, Err, C.Chunk<never>, void> = Ch.readWithCause(
    (_) => drain,
    Ch.halt,
    (_) => Ch.unit
  )

  return new Sink(drain)
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function foreach<R, Err, In>(f: (inp: In) => I.IO<R, Err, any>): Sink<R, Err, In, Err, In, void> {
  return foreachWhile(
    flow(
      f,
      I.as(() => true)
    )
  )
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function foreachChunk<R, Err, In>(f: (inp: C.Chunk<In>) => I.IO<R, Err, any>): Sink<R, Err, In, Err, In, void> {
  return foreachChunkWhile(
    flow(
      f,
      I.as(() => true)
    )
  )
}

function foreachWhileLoop<R, Err, In>(
  f: (_: In) => I.IO<R, Err, boolean>,
  chunk: C.Chunk<In>,
  idx: number,
  len: number,
  cont: Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void>
): Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void> {
  if (idx === len) {
    return cont
  }
  return pipe(
    Ch.fromEffect(f(C.unsafeGet_(chunk, idx))),
    Ch.bind((b) => (b ? foreachWhileLoop(f, chunk, idx + 1, len, cont) : Ch.write(C.drop_(chunk, idx)))),
    Ch.catchAll((e) => Ch.write(C.drop_(chunk, idx))['*>'](Ch.fail(e)))
  )
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function foreachWhile<R, Err, In>(f: (_: In) => I.IO<R, Err, boolean>): Sink<R, Err, In, Err, In, void> {
  const process: Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void> = Ch.readWithCause(
    (inp: C.Chunk<In>) => foreachWhileLoop(f, inp, 0, inp.length, process),
    Ch.halt,
    () => Ch.unit
  )
  return new Sink(process)
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it
 * until `f` evaluates to `false`.
 */
export function foreachChunkWhile<R, Err, In>(
  f: (chunk: C.Chunk<In>) => I.IO<R, Err, boolean>
): Sink<R, Err, In, Err, In, void> {
  const reader: Ch.Channel<R, Err, C.Chunk<In>, unknown, Err, C.Chunk<In>, void> = Ch.readWith(
    (inp: C.Chunk<In>) => Ch.fromEffect(f(inp))['>>=']((cont) => (cont ? reader : Ch.end(undefined))),
    (err: Err) => Ch.fail(err),
    (_) => Ch.unit
  )
  return new Sink(reader)
}

/**
 * Transforms this sink's result.
 */
export function map_<R, InErr, In, OutErr, L, Z, Z2>(
  sink: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => Z2
): Sink<R, InErr, In, OutErr, L, Z2> {
  return new Sink(Ch.map_(sink.channel, f))
}

/**
 * Transforms this sink's result.
 */
export function map<Z, Z2>(
  f: (z: Z) => Z2
): <R, InErr, In, OutErr, L>(sink: Sink<R, InErr, In, OutErr, L, Z>) => Sink<R, InErr, In, OutErr, L, Z2> {
  return (sink) => map_(sink, f)
}
