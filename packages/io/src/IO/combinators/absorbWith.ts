import type { IO } from "../core";

import { flow, pipe } from "@principia/base/data/Function";

import * as C from "../../Cause/core";
import { fail, foldM, pure } from "../core";
import { sandbox } from "./sandbox";

/**
 * ```haskell
 * absorbWith_ :: (IO r e a, (e -> _)) -> IO r _ a
 * ```
 *
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absorbWith_<R, E, A>(ef: IO<R, E, A>, f: (e: E) => unknown) {
  return pipe(ef, sandbox, foldM(flow(C.squash(f), fail), pure));
}

/**
 * ```haskell
 * absorbWith :: (e -> _) -> IO r e a -> IO r _ a
 * ```
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absorbWith<E>(f: (e: E) => unknown): <R, A>(ef: IO<R, E, A>) => IO<R, unknown, A> {
  return (ef) => absorbWith_(ef, f);
}
