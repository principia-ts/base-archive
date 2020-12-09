import { identity } from "../../Function";
import type { Option } from "../../Option";
import type { IO } from "../model";
import { refineOrDieWith_ } from "./refineOrDieWith";

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E, A, E1>(fa: IO<R, E, A>, pf: (e: E) => Option<E1>): IO<R, E1, A> {
  return refineOrDieWith_(fa, pf, identity);
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E, E1>(
  pf: (e: E) => Option<E1>
): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => refineOrDie_(fa, pf);
}
