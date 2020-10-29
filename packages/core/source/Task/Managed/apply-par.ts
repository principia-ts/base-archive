import { tuple } from "../../Function";
import { parallel, sequential } from "../ExecutionStrategy";
import { mapM_ } from "./_core";
import * as T from "./_internal/task";
import { makeManagedReleaseMap } from "./combinators/makeManagedReleaseMap";
import type { Managed } from "./model";

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const mapBothPar_ = <R, E, A, Q, D, B, C>(
   fa: Managed<R, E, A>,
   fb: Managed<Q, D, B>,
   f: (a: A, b: B) => C
): Managed<R & Q, E | D, C> =>
   mapM_(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const innerMap = T.local_(makeManagedReleaseMap(sequential()).task, (r: R & Q) => tuple(r, parallelReleaseMap));

      return T.chain_(T.both_(innerMap, innerMap), ([[_, l], [__, r]]) =>
         T.mapBothPar_(
            T.local_(fa.task, (_: R & Q) => tuple(_, l)),
            T.local_(fb.task, (_: R & Q) => tuple(_, r)),
            ([_, a], [__, a2]) => f(a, a2)
         )
      );
   });

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const mapBothPar = <A, Q, D, B, C>(fb: Managed<Q, D, B>, f: (a: A, b: B) => C) => <R, E>(
   fa: Managed<R, E, A>
): Managed<R & Q, E | D, C> => mapBothPar_(fa, fb, f);

export const apPar_ = <R, E, A, Q, D, B>(
   fab: Managed<Q, D, (a: A) => B>,
   fa: Managed<R, E, A>
): Managed<Q & R, D | E, B> => mapBothPar_(fab, fa, (f, a) => f(a));

export const apFirstPar_ = <R, E, A, Q, D, B>(fa: Managed<R, E, A>, fb: Managed<Q, D, B>): Managed<Q & R, D | E, A> =>
   mapBothPar_(fa, fb, (a, _) => a);

export const apSecondPar_ = <R, E, A, Q, D, B>(fa: Managed<R, E, A>, fb: Managed<Q, D, B>): Managed<Q & R, D | E, B> =>
   mapBothPar_(fa, fb, (_, b) => b);
