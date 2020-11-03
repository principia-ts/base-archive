import { tuple } from "../Function";
import { mapBoth_ } from "./apply-seq";
import { succeed } from "./constructors";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Sequential Applicative Async
 * -------------------------------------------
 */

export const both_ = <R, E, A, R1, E1, A1>(
   fa: Async<R, E, A>,
   fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> => mapBoth_(fa, fb, tuple);

export const both = <R1, E1, A1>(fb: Async<R1, E1, A1>) => <R, E, A>(
   fa: Async<R, E, A>
): Async<R & R1, E | E1, readonly [A, A1]> => both_(fa, fb);

export const pure = <A>(a: A): Async<unknown, never, A> => succeed(a);
