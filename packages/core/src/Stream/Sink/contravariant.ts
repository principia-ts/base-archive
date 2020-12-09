import * as A from "../../Chunk";
import * as E from "../../Either";
import { pipe } from "../../Function";
import * as I from "../../IO";
import * as M from "../../Managed";
import * as O from "../../Option";
import { map_, mapM_ } from "./functor";
import { Sink } from "./model";

/**
 * Transforms this sink's input elements.
 */
export function contramap_<R, E, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I
): Sink<R, E, I2, L, Z> {
  return contramapChunks_(fa, A.map(f));
}

/**
 * Transforms this sink's input elements.
 */
export function contramap<I, I2>(f: (i2: I2) => I) {
  return <R, E, L, Z>(fa: Sink<R, E, I, L, Z>) => contramap_(fa, f);
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM_<R, R1, E, E1, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I.IO<R1, E1, I>
): Sink<R & R1, E | E1, I2, L, Z> {
  return contramapChunksM_(fa, I.foreach(f));
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM<R1, E1, I, I2>(f: (i2: I2) => I.IO<R1, E1, I>) {
  return <R, E, L, Z>(fa: Sink<R, E, I, L, Z>) => contramapM_(fa, f);
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, E, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (a: A.Chunk<I2>) => A.Chunk<I>
): Sink<R, E, I2, L, Z> {
  return new Sink(M.map_(fa.push, (push) => (input) => push(O.map_(input, f))));
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks<I, I2>(f: (a: A.Chunk<I2>) => A.Chunk<I>) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapChunks_(self, f);
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM_<R, R1, E, E1, I, I2, L, Z>(
  fa: Sink<R, E, I, L, Z>,
  f: (a: A.Chunk<I2>) => I.IO<R1, E1, A.Chunk<I>>
): Sink<R & R1, E | E1, I2, L, Z> {
  return new Sink(
    M.map_(fa.push, (push) => {
      return (input: O.Option<A.Chunk<I2>>) =>
        O.fold_(
          input,
          () => push(O.none()),
          (value) =>
            pipe(
              f(value),
              I.mapError((e: E | E1) => [E.left(e), A.empty<L>()] as const),
              I.chain((is) => push(O.some(is)))
            )
        );
    })
  );
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM<R1, E1, I, I2>(f: (a: A.Chunk<I2>) => I.IO<R1, E1, A.Chunk<I>>) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapChunksM_(self, f);
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap_<R, E, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I,
  g: (z: Z) => Z2
): Sink<R, E, I2, L, Z2> {
  return map_(contramap_(fa, f), g);
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap<I, I2, Z, Z2>(f: (i2: I2) => I, g: (z: Z) => Z2) {
  return <R, E, L>(fa: Sink<R, E, I, L, Z>) => dimap_(fa, f, g);
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapM_<R, R1, E, E1, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I.IO<R1, E1, I>,
  g: (z: Z) => I.IO<R1, E1, Z2>
): Sink<R & R1, E | E1, I2, L, Z2> {
  return mapM_(contramapM_(fa, f), g);
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapM<R1, E1, I, I2, Z, Z2>(
  f: (i2: I2) => I.IO<R1, E1, I>,
  g: (z: Z) => I.IO<R1, E1, Z2>
) {
  return <R, E, L>(self: Sink<R, E, I, L, Z>) => dimapM_(self, f, g);
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks_<R, E, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: A.Chunk<I2>) => A.Chunk<I>,
  g: (z: Z) => Z2
): Sink<R, E, I2, L, Z2> {
  return map_(contramapChunks_(fa, f), g);
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks<I, I2, Z, Z2>(f: (i2: A.Chunk<I2>) => A.Chunk<I>, g: (z: Z) => Z2) {
  return <R, E, L>(fa: Sink<R, E, I, L, Z>) => dimapChunks_(fa, f, g);
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksM_<R, R1, E, E1, I, I2, L, Z, Z2>(
  fa: Sink<R, E, I, L, Z>,
  f: (i2: A.Chunk<I2>) => I.IO<R1, E1, A.Chunk<I>>,
  g: (z: Z) => I.IO<R1, E1, Z2>
): Sink<R & R1, E | E1, I2, L, Z2> {
  return mapM_(contramapChunksM_(fa, f), g);
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksM<R1, E1, I, I2, Z, Z2>(
  f: (i2: A.Chunk<I2>) => I.IO<R1, E1, A.Chunk<I>>,
  g: (z: Z) => I.IO<R1, E1, Z2>
) {
  return <R, E, L>(fa: Sink<R, E, I, L, Z>) => dimapChunksM_(fa, f, g);
}
