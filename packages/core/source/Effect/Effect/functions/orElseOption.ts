import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { catchAll_ } from "../core";
import type { Effect } from "../model";

export const orElseOption_ = <R, E, A, R1, E1, A1>(
   ma: Effect<R, Option<E>, A>,
   that: () => Effect<R1, Option<E1>, A1>
): Effect<R & R1, Option<E | E1>, A | A1> =>
   catchAll_(
      ma,
      O.fold(that, (e) => fail(O.some<E | E1>(e)))
   );

export const orElseOption = <R1, E1, A1>(that: () => Effect<R1, Option<E1>, A1>) => <R, E, A>(
   ma: Effect<R, Option<E>, A>
) => orElseOption_(ma, that);
