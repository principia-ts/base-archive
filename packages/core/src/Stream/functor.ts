import type { Chunk } from "../Chunk";
import * as C from "../Chunk";
import { flow, pipe } from "../Function";
import * as I from "../IO";
import * as M from "../Managed";
import type { Option } from "../Option";
import * as O from "../Option";
import * as BPull from "./BufferedPull";
import { Stream } from "./model";

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM_<R, E, A, R1, E1, B>(
  fa: Stream<R, E, A>,
  f: (chunks: Chunk<A>) => I.IO<R1, E1, Chunk<B>>
): Stream<R & R1, E | E1, B> {
  return new Stream(
    pipe(
      fa.proc,
      M.map((e) =>
        pipe(
          e,
          I.chain((x) => pipe(f(x), I.mapError<E1, Option<E | E1>>(O.some)))
        )
      )
    )
  );
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM<A, R1, E1, A1>(
  f: (chunks: Chunk<A>) => I.IO<R1, E1, Chunk<A1>>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E1 | E, A1> {
  return (fa) => mapChunksM_(fa, f);
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, A, B>(
  fa: Stream<R, E, A>,
  f: (chunks: Chunk<A>) => Chunk<B>
): Stream<R, E, B> {
  return mapChunksM_(fa, flow(f, I.pure));
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks<A, B>(
  f: (chunks: Chunk<A>) => Chunk<B>
): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, B> {
  return (fa) => mapChunks_(fa, f);
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function map_<R, E, A, B>(fa: Stream<R, E, A>, f: (a: A) => B): Stream<R, E, B> {
  return mapChunks_(fa, C.map(f));
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, B> {
  return (fa) => map_(fa, f);
}

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapM_<R, E, A, R1, E1, B>(
  fa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return new Stream<R & R1, E | E1, B>(
    pipe(
      fa.proc,
      M.mapM(BPull.make),
      M.map((pull) =>
        pipe(
          pull,
          BPull.pullElement,
          I.chain((o) => pipe(f(o), I.bimap(O.some, C.single)))
        )
      )
    )
  );
}

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapM<A, R1, E1, A1>(
  f: (o: A) => I.IO<R1, E1, A1>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E1 | E, A1> {
  return (fa) => mapM_(fa, f);
}
