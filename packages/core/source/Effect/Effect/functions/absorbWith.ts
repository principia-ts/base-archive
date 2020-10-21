import { flow, pipe } from "../../../Function";
import * as C from "../../Cause";
import { fail, foldM, pure } from "../core";
import type { Effect } from "../model";
import { sandbox } from "./sandbox";

/**
 * ```haskell
 * absorbWith_ :: (Effect r e a, (e -> _)) -> Effect r _ a
 * ```
 *
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const absorbWith_ = <R, E, A>(ef: Effect<R, E, A>, f: (e: E) => unknown) =>
   pipe(ef, sandbox, foldM(flow(C.squash(f), fail), pure));

/**
 * ```haskell
 * absorbWith :: (e -> _) -> Effect r e a -> Effect r _ a
 * ```
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const absorbWith = <E>(f: (e: E) => unknown) => <R, A>(ef: Effect<R, E, A>): Effect<R, unknown, A> =>
   absorbWith_(ef, f);
