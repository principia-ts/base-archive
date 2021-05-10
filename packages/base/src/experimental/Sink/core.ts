import * as C from '../../Chunk'
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
