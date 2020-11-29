import { flow, pipe } from "../../../Function";
import * as C from "../../Exit/Cause";
import { fail, foldM, pure } from "../_core";
import type { AIO } from "../model";
import { sandbox } from "./sandbox";

/**
 * ```haskell
 * absorbWith_ :: (AIO r e a, (e -> _)) -> AIO r _ a
 * ```
 *
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absorbWith_<R, E, A>(ef: AIO<R, E, A>, f: (e: E) => unknown) {
  return pipe(ef, sandbox, foldM(flow(C.squash(f), fail), pure));
}

/**
 * ```haskell
 * absorbWith :: (e -> _) -> AIO r e a -> AIO r _ a
 * ```
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absorbWith<E>(
  f: (e: E) => unknown
): <R, A>(ef: AIO<R, E, A>) => AIO<R, unknown, A> {
  return (ef) => absorbWith_(ef, f);
}
