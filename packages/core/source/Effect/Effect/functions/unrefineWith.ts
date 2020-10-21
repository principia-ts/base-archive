import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as C from "../../Cause";
import { fail, halt } from "../core";
import type { Effect } from "../model";
import { catchAllCause_ } from "./catchAllCause";

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const unrefineWith_ = <R, E, A, E1, E2>(
   fa: Effect<R, E, A>,
   pf: (u: unknown) => Option<E1>,
   f: (e: E) => E2
): Effect<R, E1 | E2, A> =>
   catchAllCause_(
      fa,
      (cause): Effect<R, E1 | E2, A> =>
         pipe(
            cause,
            C.find(pf),
            O.fold(() => pipe(cause, C.map(f), halt), fail)
         )
   );

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const unrefineWith = <E1>(fa: (u: unknown) => Option<E1>) => <E, E2>(f: (e: E) => E2) => <R, A>(
   ef: Effect<R, E, A>
) => unrefineWith_(ef, fa, f);
