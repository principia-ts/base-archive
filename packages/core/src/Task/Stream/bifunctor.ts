import { pipe } from "../../Function";
import * as O from "../../Option";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import * as M from "../Managed";
import * as T from "../Task";
import { map } from "./functor";
import { Stream } from "./model";

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, A, D>(pab: Stream<R, E, A>, f: (e: E) => D) {
  return new Stream(pipe(pab.proc, M.map(T.mapError(O.map(f)))));
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError<E, D>(f: (e: E) => D) {
  return <R, A>(pab: Stream<R, E, A>) => mapError_(pab, f);
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause_<R, E, A, E1>(
  stream: Stream<R, E, A>,
  f: (e: Cause<E>) => Cause<E1>
): Stream<R, E1, A> {
  return new Stream(
    pipe(
      stream.proc,
      M.map(
        T.mapErrorCause((cause) =>
          pipe(
            C.sequenceCauseOption(cause),
            O.fold(
              () => C.fail(O.none()),
              (c) => C.map_(f(c), O.some)
            )
          )
        )
      )
    )
  );
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause<E, D>(
  f: (e: Cause<E>) => Cause<D>
): <R, A>(stream: Stream<R, E, A>) => Stream<R, D, A> {
  return (stream) => mapErrorCause_(stream, f);
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, O, E1, O1>(
  pab: Stream<R, E, O>,
  f: (e: E) => E1,
  g: (o: O) => O1
): Stream<R, E1, O1> {
  return pipe(pab, mapError(f), map(g));
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, O, E1, O1>(
  f: (e: E) => E1,
  g: (o: O) => O1
): <R>(pab: Stream<R, E, O>) => Stream<R, E1, O1> {
  return (pab) => bimap_(pab, f, g);
}
