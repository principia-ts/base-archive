import { fail, foldM, pure } from "../_core";
import { flow, pipe } from "../../../Function";
import * as C from "../../Exit/Cause";
import type { Task } from "../model";
import { sandbox } from "./sandbox";

/**
 * ```haskell
 * absorbWith_ :: (Task r e a, (e -> _)) -> Task r _ a
 * ```
 *
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absorbWith_<R, E, A>(ef: Task<R, E, A>, f: (e: E) => unknown) {
  return pipe(ef, sandbox, foldM(flow(C.squash(f), fail), pure));
}

/**
 * ```haskell
 * absorbWith :: (e -> _) -> Task r e a -> Task r _ a
 * ```
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absorbWith<E>(
  f: (e: E) => unknown
): <R, A>(ef: Task<R, E, A>) => Task<R, unknown, A> {
  return (ef) => absorbWith_(ef, f);
}
