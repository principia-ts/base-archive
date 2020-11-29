import * as A from "../../../Array";
import * as M from "../../Managed";
import * as T from "../../AIO";
import { Transducer } from "./model";

/**
 * Transforms the outputs of this transducer.
 */
export function map_<R, E, I, O, O1>(
  fa: Transducer<R, E, I, O>,
  f: (o: O) => O1
): Transducer<R, E, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => T.map_(push(input), A.map(f))));
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
  f: (chunks: ReadonlyArray<O>) => ReadonlyArray<O1>
): Transducer<R, E, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => T.map_(push(input), f)));
}

/**
 * Transforms the chunks emitted by this transducer.
 */
export function mapChunks<O, O1>(
  f: (chunks: ReadonlyArray<O>) => ReadonlyArray<O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O1> {
  return (fa) => mapChunks_(fa, f);
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksM_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (chunk: ReadonlyArray<O>) => T.AIO<R1, E1, ReadonlyArray<O1>>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => T.chain_(push(input), f)));
}

/**
 * Effectfully transforms the chunks emitted by this transducer.
 */
export function mapChunksM<O, R1, E1, O1>(
  f: (chunk: ReadonlyArray<O>) => T.AIO<R1, E1, ReadonlyArray<O1>>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapChunksM_(fa, f);
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapM_<R, E, I, O, R1, E1, O1>(
  fa: Transducer<R, E, I, O>,
  f: (o: O) => T.AIO<R1, E1, O1>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(M.map_(fa.push, (push) => (input) => T.chain_(push(input), T.foreach(f))));
}

/**
 * Effectually transforms the outputs of this transducer
 */
export function mapM<O, R1, E1, O1>(
  f: (o: O) => T.AIO<R1, E1, O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
  return (fa) => mapM_(fa, f);
}
