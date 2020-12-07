import type { Chunk } from "../Chunk";
import * as C from "../Chunk";
import { identity, pipe } from "../Function";
import * as I from "../IO";
import * as XR from "../IORef";
import * as M from "../Managed";
import * as RM from "../Managed/ReleaseMap";
import type { Option } from "../Option";
import { mapM_ } from "./functor";
import { Chain, Stream } from "./model";
import * as Pull from "./Pull";

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain_<R, E, A, Q, D, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => Stream<Q, D, B>
): Stream<R & Q, E | D, B> {
  type R_ = R & Q;
  type E_ = E | D;

  return new Stream(
    pipe(
      M.do,
      M.bindS("outerStream", () => ma.proc),
      M.bindS("currOuterChunk", () =>
        I.toManaged()(
          XR.make<[Chunk<A>, number]>([C.empty(), 0])
        )
      ),
      M.bindS("currInnerStream", () =>
        I.toManaged()(XR.make<I.IO<R_, Option<E_>, Chunk<B>>>(Pull.end))
      ),
      M.bindS(
        "innerFinalizer",
        () => M.finalizerRef(RM.noopFinalizer) as M.Managed<R_, never, XR.URef<RM.Finalizer>>
      ),
      M.map(({ currInnerStream, currOuterChunk, innerFinalizer, outerStream }) =>
        new Chain(f, outerStream, currOuterChunk, currInnerStream, innerFinalizer).apply()
      )
    )
  );
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain<A, Q, D, B>(
  f: (a: A) => Stream<Q, D, B>
): <R, E>(ma: Stream<R, E, A>) => Stream<Q & R, D | E, B> {
  return (ma) => chain_(ma, f);
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R, E, Q, D, A>(
  ffa: Stream<R, E, Stream<Q, D, A>>
): Stream<Q & R, D | E, A> {
  return chain_(ffa, identity);
}

export function tap_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (o: O) => I.IO<R1, E1, O1>
): Stream<R & R1, E | E1, O> {
  return mapM_(ma, (o) => I.as_(f(o), () => o));
}

export function tap<O, R1, E1, O1>(
  f: (o: O) => I.IO<R1, E1, O1>
): <R, E>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O> {
  return (ma) => tap_(ma, f);
}
