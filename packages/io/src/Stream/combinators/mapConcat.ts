import type { Stream } from "../core";

import { identity, pipe } from "@principia/base/data/Function";

import * as C from "../../Chunk";
import * as I from "../../IO";
import { mapChunks_, mapM } from "../core";

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat_<R, E, A, B>(ma: Stream<R, E, A>, f: (a: A) => Iterable<B>) {
  return mapChunks_(ma, (chunks) => C.flatMap_(chunks, (a) => Array.from(f(a))));
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
  return mapChunks_(ma, (chunks) => C.flatMap_(chunks, f));
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
  f: (a: A) => I.IO<R1, E1, ReadonlyArray<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(ma, mapM(f), mapConcatChunk(identity));
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, ReadonlyArray<B>>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (ma) => mapConcatChunkM_(ma, f);
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, Iterable<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(
    ma,
    mapConcatChunkM((a) => I.map_(f(a), (_) => Array.from(_)))
  );
}

export function mapConcatM<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, Iterable<B>>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (ma) => mapConcatM_(ma, f);
}
