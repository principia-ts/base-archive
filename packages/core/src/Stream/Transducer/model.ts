import type * as I from "../../IO";
import type * as M from "../../Managed";
import type { Option } from "../../Option";

// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must
//   result in empty [].
export class Transducer<R, E, I, O> {
  constructor(
    readonly push: M.Managed<
      R,
      never,
      (c: Option<ReadonlyArray<I>>) => I.IO<R, E, ReadonlyArray<O>>
    >
  ) {}
}

/**
 * Contract notes for transducers:
 * - When a None is received, the transducer must flush all of its internal state
 *   and remain empty until subsequent Some(Chunk) values.
 *
 *   Stated differently, after a first push(None), all subsequent push(None) must
 *   result in empty [].
 */
export function transducer<R, E, I, O, R1>(
  push: M.Managed<R, never, (c: Option<ReadonlyArray<I>>) => I.IO<R1, E, ReadonlyArray<O>>>
): Transducer<R & R1, E, I, O> {
  return new Transducer<R & R1, E, I, O>(push);
}
