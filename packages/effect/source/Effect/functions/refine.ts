import { pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import { catchAll_, die, fail } from "../core";
import type { Effect } from "../Effect";

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export const refineOrDie_ = <R, E, A, D>(fa: Effect<R, E, A>, pf: (e: E) => Option<D>) =>
   catchAll_(fa, (e) =>
      pipe(
         e,
         pf,
         O.fold(() => die(e), fail)
      )
   );

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export const refineOrDie = <E, E1>(pf: (e: E) => Option<E1>) => <R, A>(fa: Effect<R, E, A>) => refineOrDie_(fa, pf);

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export const refineOrDieWith_ = <R, E, A, D>(fa: Effect<R, E, A>, pf: (e: E) => Option<D>, f: (e: E) => unknown) =>
   catchAll_(fa, (e) =>
      pipe(
         e,
         pf,
         O.fold(() => die(f(e)), fail)
      )
   );

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export const refineOrDieWith = <E, E1>(pf: (e: E) => Option<E1>, f: (e: E) => unknown) => <R, A>(fa: Effect<R, E, A>) =>
   catchAll_(fa, (e) =>
      pipe(
         e,
         pf,
         O.fold(() => die(f(e)), fail)
      )
   );
