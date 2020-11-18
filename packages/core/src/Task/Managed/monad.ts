import { identity } from "../../Function";
import * as Ex from "../Exit";
import type { Cause } from "../Exit/Cause";
import type { Task } from "./_internal/task";
import * as T from "./_internal/task";
import { catchAllCause_ } from "./combinators/catchAll";
import { fail, halt, succeed } from "./constructors";
import { foldM_ } from "./fold";
import { map_, mapM, mapM_ } from "./functor";
import { Managed } from "./model";

/*
 * -------------------------------------------
 * Monad Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function chain<R1, E1, A, A1>(
  f: (a: A) => Managed<R1, E1, A1>
): <R, E>(self: Managed<R, E, A>) => Managed<R & R1, E1 | E, A1> {
  return (self) => chain_(self, f);
}

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function chain_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R1, E1, A1>
): Managed<R & R1, E | E1, A1> {
  return new Managed<R & R1, E | E1, A1>(
    T.chain_(self.task, ([releaseSelf, a]) =>
      T.map_(f(a).task, ([releaseThat, b]) => [
        (e) =>
          T.chain_(T.result(releaseThat(e)), (e1) =>
            T.chain_(T.result(releaseSelf(e1)), (e2) => T.done(Ex.apSecond_(e1, e2)))
          ),
        b
      ])
    )
  );
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap_<R, E, A, Q, D>(
  ma: Managed<R, E, A>,
  f: (a: A) => Managed<Q, D, any>
): Managed<R & Q, E | D, A> {
  return chain_(ma, (a) => map_(f(a), () => a));
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap<R1, E1, A>(
  f: (a: A) => Managed<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => tap_(ma, f);
}

export const flatten: <R, E, R1, E1, A>(
  mma: Managed<R, E, Managed<R1, E1, A>>
) => Managed<R & R1, E | E1, A> = chain(identity);

export const flattenM: <R, E, R1, E1, A>(
  mma: Managed<R, E, T.Task<R1, E1, A>>
) => Managed<R & R1, E | E1, A> = mapM(identity);

export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return foldM_(
    ma,
    (e) => chain_(f(e), () => fail(e)),
    (a) => map_(g(a), () => a)
  );
}

export function tapBoth<E, A, R1, E1, R2, E2>(
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E | E1 | E2, A> {
  return (ma) => tapBoth_(ma, f, g);
}

export function tapCause_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(ma, (c) => chain_(f(c), () => halt(c)));
}

export function tapCause<E, R1, E1>(
  f: (c: Cause<E>) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapCause_(ma, f);
}

export function tapError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return tapBoth_(ma, f, succeed);
}

export function tapError<E, R1, E1>(
  f: (e: E) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapError_(ma, f);
}

export function tapM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (a: A) => Task<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return mapM_(ma, (a) => T.as_(f(a), () => a));
}

export function tapM<A, R1, E1>(
  f: (a: A) => Task<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapM_(ma, f);
}
