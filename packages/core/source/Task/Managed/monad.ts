import * as Ex from "../Exit";
import * as T from "./_internal/task";
import { map_ } from "./functor";
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
export const chain = <R1, E1, A, A1>(f: (a: A) => Managed<R1, E1, A1>) => <R, E>(self: Managed<R, E, A>) =>
   chain_(self, f);

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain_ = <R, E, A, R1, E1, A1>(self: Managed<R, E, A>, f: (a: A) => Managed<R1, E1, A1>) =>
   new Managed<R & R1, E | E1, A1>(
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

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const tap = <R1, E1, A>(f: (a: A) => Managed<R1, E1, any>) => <R, E>(self: Managed<R, E, A>) =>
   chain_(self, (a) => map_(f(a), () => a));

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const tap_ = <R, E, A, Q, D>(ma: Managed<R, E, A>, f: (a: A) => Managed<Q, D, any>): Managed<R & Q, E | D, A> =>
   tap(f)(ma);
