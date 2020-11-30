import type { Option } from "../../Option";
import * as O from "../../Option";
import { catchAll_ } from "../_core";
import type { IO } from "../model";

export function orElseOption_<R, E, A, R1, E1, A1>(
  ma: IO<R, Option<E>, A>,
  that: () => IO<R1, Option<E1>, A1>
): IO<R & R1, Option<E | E1>, A | A1> {
  return catchAll_(
    ma,
    O.fold(that, (e) => fail(O.some<E | E1>(e)))
  );
}

export function orElseOption<R1, E1, A1>(
  that: () => IO<R1, Option<E1>, A1>
): <R, E, A>(ma: IO<R, Option<E>, A>) => IO<R & R1, Option<E1 | E>, A1 | A> {
  return (ma) => orElseOption_(ma, that);
}
