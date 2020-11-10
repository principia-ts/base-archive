import { catchAll_, die, fail } from "../_core";
import { identity } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { Task } from "../model";

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export const refineOrDie_ = <R, E, A, E1>(fa: Task<R, E, A>, pf: (e: E) => Option<E1>) =>
   refineOrDieWith_(fa, pf, identity);

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export const refineOrDie = <E, E1>(pf: (e: E) => Option<E1>) => <R, A>(fa: Task<R, E, A>) => refineOrDie_(fa, pf);

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export const refineOrDieWith_ = <R, E, A, E1>(fa: Task<R, E, A>, pf: (e: E) => Option<E1>, f: (e: E) => unknown) =>
   catchAll_(fa, (e) => O.fold_(pf(e), () => die(f(e)), fail));

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export const refineOrDieWith = <E, E1>(pf: (e: E) => Option<E1>, f: (e: E) => unknown) => <R, A>(fa: Task<R, E, A>) =>
   refineOrDieWith_(fa, pf, f);
