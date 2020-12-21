import type { IO } from "../core";
import type { Option } from "@principia/base/data/Option";

import * as O from "@principia/base/data/Option";

import { fail, flatMap_, pure, total } from "../core";

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, A, E1>(
  ma: IO<R, E, Option<A>>,
  orFail: () => E1
): IO<R, E | E1, A> {
  return flatMap_(
    ma,
    O.fold(() => flatMap_(total(orFail), fail), pure)
  );
}

export function someOrFail<E1>(
  orFail: () => E1
): <R, E, A>(ma: IO<R, E, Option<A>>) => IO<R, E1 | E, A> {
  return (ma) => someOrFail_(ma, orFail);
}
