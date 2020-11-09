import { UnknownArray } from "packages/core/source/Eq";

import type { Task } from "../_internal/task";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { fail, succeed, total } from "../constructors";
import type { Managed } from "../model";
import { chain_ } from "../monad";
import { asks, asksM, asksManaged } from "../reader";

/**
 * Lifts an `Either` into a `ZManaged` value.
 */
export const fromEither = <E, A>(ea: () => Either<E, A>): Managed<unknown, E, A> =>
   chain_(total(ea), E.fold(fail, succeed));

/**
 * Lifts a function `R => A` into a `Managed<R, never, A>`.
 */
export const fromFunction = <R, A>(f: (r: R) => A): Managed<R, never, A> => asks(f);

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 */
export const fromFunctionM = <R, E, A>(f: (r: R) => Task<unknown, E, A>): Managed<R, E, A> => asksM(f);

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 */
export const fromFunctionManaged = <R, E, A>(f: (r: R) => Managed<unknown, E, A>): Managed<R, E, A> => asksManaged(f);
