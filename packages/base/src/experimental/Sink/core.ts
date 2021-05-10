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

function collectLoop<Err, A>(
  state: C.Chunk<A>
): Ch.Channel<unknown, Err, C.Chunk<A>, unknown, Err, C.Chunk<never>, C.Chunk<A>> {
  return Ch.readWithCause(
    (i) => collectLoop(C.concat_(state, i)),
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
    Ch.catchAll((e) => pipe(Ch.write(C.drop_(chunk, idx)), Ch.zipRight(Ch.fail(e))))
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
    (inp: C.Chunk<In>) =>
      pipe(
        Ch.fromEffect(f(inp)),
        Ch.bind((cont) => (cont ? reader : Ch.end(undefined)))
      ),
    (err: Err) => Ch.fail(err),
    (_) => Ch.unit
  )
  return new Sink(reader)
}
