import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import * as I from "../../IO";
import * as M from "../../Managed";
import { Transducer } from "./model";

/**
 * Transforms the outputs of this transducer.
 */
export function map_<R, E, I, O, O1>(
  fa: Transducer<R, E, I, O>,
  f: (o: O) => O1
): Transducer<R, E, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => I.map_(push(input), C.map(f))));
}

/**
 * Transforms the outputs of this transducer.
 */
export function map<O, P>(
  f: (o: O) => P
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, P> {
  return (fa) => map_(fa, f);
}

/**
 * Transforms the chunks emitted by this transducer.
 */
export function mapChunks_<R, E, I, O, O1>(
  fa: Transducer<R, E, I, O>,
  f: (chunks: Chunk<O>) => Chunk<O1>
): Transducer<R, E, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => I.map_(push(input), f)));
}

/**
 * Transforms the chunks emitted by this transducer.
 */
export function mapChunks<O, O1>(
  f: (chunks: Chunk<O>) => Chunk<O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O1> {
  return (fa) => mapChunks_(fa, f);
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksM_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (chunk: Chunk<O>) => I.IO<R1, E1, Chunk<O1>>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => I.chain_(push(input), f)));
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksM<O, R1, E1, O1>(
  f: (chunk: Chunk<O>) => I.IO<R1, E1, Chunk<O1>>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapChunksM_(fa, f);
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapM_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (o: O) => I.IO<R1, E1, O1>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => I.chain_(push(input), I.foreach(f))));
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapM<O, R1, E1, O1>(
  f: (o: O) => I.IO<R1, E1, O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapM_(fa, f);
}
