import * as A from "../../../Array";
import { identity, pipe } from "../../../Function";
import * as T from "../../Task";
import { mapChunks_, mapM } from "../functor";
import type { Stream } from "../model";

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat_<R, E, A, B>(ma: Stream<R, E, A>, f: (a: A) => Iterable<B>) {
  return mapChunks_(ma, (chunks) => A.chain_(chunks, (a) => A.from(f(a))));
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat<A, B>(
  f: (a: A) => Iterable<B>
): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, B> {
  return (ma) => mapConcat_(ma, f);
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk_<R, E, A, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => ReadonlyArray<B>
): Stream<R, E, B> {
  return mapChunks_(ma, (chunks) => A.chain_(chunks, f));
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk<A, B>(
  f: (a: A) => ReadonlyArray<B>
): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, B> {
  return (ma) => mapConcatChunk_(ma, f);
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(ma, mapM(f), mapConcatChunk(identity));
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM<A, R1, E1, B>(
  f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (ma) => mapConcatChunkM_(ma, f);
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => T.Task<R1, E1, Iterable<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(
    ma,
    mapConcatChunkM((a) => T.map_(f(a), (_) => A.from(_)))
  );
}

export function mapConcatM<A, R1, E1, B>(
  f: (a: A) => T.Task<R1, E1, Iterable<B>>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (ma) => mapConcatM_(ma, f);
}
