import type { Option } from "../../Option";
import * as O from "../../Option";
import { chain_, fail, pure, total } from "../_core";
import type { IO } from "../model";

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, A, E1>(
  ma: IO<R, E, Option<A>>,
  orFail: () => E1
): IO<R, E | E1, A> {
  return chain_(
    ma,
    O.fold(() => chain_(total(orFail), fail), pure)
  );
}

export function someOrFail<E1>(
  orFail: () => E1
): <R, E, A>(ma: IO<R, E, Option<A>>) => IO<R, E1 | E, A> {
  return (ma) => someOrFail_(ma, orFail);
}
