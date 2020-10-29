import { map_ } from "./functor";
import type { XPure } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply XPure
 * -------------------------------------------
 */

export const mapBoth_ = <S1, S2, R, E, A, S3, Q, D, B, C>(
   fa: XPure<S1, S2, R, E, A>,
   fb: XPure<S2, S3, Q, D, B>,
   f: (a: A, b: B) => C
): XPure<S1, S3, Q & R, D | E, C> => chain_(fa, (a) => map_(fb, (b) => f(a, b)));

export const mapBoth = <A, S2, S3, Q, D, B, C>(fb: XPure<S2, S3, Q, D, B>, f: (a: A, b: B) => C) => <S1, R, E>(
   fa: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, C> => mapBoth_(fa, fb, f);
