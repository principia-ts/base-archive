import type { Stream } from "../core";
import type { Option } from "@principia/base/data/Option";

import { identity } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import { fail } from "../core";
import { catchAll_ } from "./catchAll";

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (e: E) => Option<Stream<R1, E1, O1>>
): Stream<R & R1, E | E1, O | O1> {
  return catchAll_(ma, (e) =>
    O.fold_(f(e), (): Stream<R & R1, E | E1, O | O1> => fail(e), identity)
  );
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome<E, R1, E1, O1>(
  f: (e: E) => Option<Stream<R1, E1, O1>>
): <R, O>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O | O1> {
  return (ma) => catchSome_(ma, f);
}
