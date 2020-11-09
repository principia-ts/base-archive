import * as O from "../../../Option";
import { succeed } from "../constructors";
import type { Managed } from "../model";
import { orElse_ } from "./orElse";

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export const orElseSucceed_ = <R, E, A, A1>(ma: Managed<R, E, A>, that: () => A1): Managed<R, E, A | A1> =>
   orElse_(ma, () => succeed(that()));

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export const orElseSucceed = <A1>(that: () => A1) => <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, A | A1> =>
   orElseSucceed_(ma, that);
