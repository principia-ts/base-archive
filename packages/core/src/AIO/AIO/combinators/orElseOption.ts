import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { catchAll_ } from "../_core";
import type { AIO } from "../model";

export function orElseOption_<R, E, A, R1, E1, A1>(
  ma: AIO<R, Option<E>, A>,
  that: () => AIO<R1, Option<E1>, A1>
): AIO<R & R1, Option<E | E1>, A | A1> {
  return catchAll_(
    ma,
    O.fold(that, (e) => fail(O.some<E | E1>(e)))
  );
}

export function orElseOption<R1, E1, A1>(
  that: () => AIO<R1, Option<E1>, A1>
): <R, E, A>(ma: AIO<R, Option<E>, A>) => AIO<R & R1, Option<E1 | E>, A1 | A> {
  return (ma) => orElseOption_(ma, that);
}
