import * as E from "@principia/core/Either";

import type { Cause } from "../../Cause";
import * as C from "../../Cause";
import { chain_, foldCauseM_, halt, pure } from "../core";
import type { Effect } from "../Effect";

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 */
export const tapBoth_ = <R, E, A, R1, E1, R2, E2>(
   fa: Effect<R, E, A>,
   onFailure: (e: E) => Effect<R1, E1, any>,
   onSuccess: (a: A) => Effect<R2, E2, any>
) =>
   foldCauseM_(
      fa,
      (c) =>
         E.fold_(
            C.failureOrCause(c),
            (e) => chain_(onFailure(e), () => halt(c)),
            (_) => halt(c)
         ),
      onSuccess
   );

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 */
export const tapBoth = <E, A, R1, E1, R2, E2>(
   onFailure: (e: E) => Effect<R1, E1, any>,
   onSuccess: (a: A) => Effect<R2, E2, any>
) => <R>(fa: Effect<R, E, A>) => tapBoth_(fa, onFailure, onSuccess);

/**
 * Returns an effect that effectfully "peeks" at the cause of the failure of
 * this effect.
 */
export const tapCause_ = <R, E, A, R1, E1>(fa: Effect<R, E, A>, f: (e: Cause<E>) => Effect<R1, E1, any>) =>
   foldCauseM_(fa, (c) => chain_(f(c), () => halt(c)), pure);

/**
 * Returns an effect that effectfully "peeks" at the cause of the failure of
 * this effect.
 */
export const tapCause = <E, R1, E1>(f: (e: Cause<E>) => Effect<R1, E1, any>) => <R, A>(fa: Effect<R, E, A>) =>
   tapCause_(fa, f);

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export const tapError_ = <R, E, A, R1, E1>(fa: Effect<R, E, A>, f: (e: E) => Effect<R1, E1, any>) =>
   foldCauseM_(
      fa,
      (c) =>
         E.fold_(
            C.failureOrCause(c),
            (e) => chain_(f(e), () => halt(c)),
            (_) => halt(c)
         ),
      pure
   );

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export const tapError = <E, R1, E1>(f: (e: E) => Effect<R1, E1, any>) => <R, A>(fa: Effect<R, E, A>) =>
   tapError_(fa, f);
