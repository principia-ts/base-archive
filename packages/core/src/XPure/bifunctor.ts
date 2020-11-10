import { succeed } from "./constructors";
import { foldM_ } from "./fold";
import type { XPure } from "./model";

/*
 * -------------------------------------------
 * Bifunctor XPure
 * -------------------------------------------
 */

export const bimap_ = <S1, S2, R, E, A, G, B>(
   pab: XPure<S1, S2, R, E, A>,
   f: (e: E) => G,
   g: (a: A) => B
): XPure<S1, S2, R, G, B> =>
   foldM_(
      pab,
      (e) => fail(f(e)),
      (a) => succeed(g(a))
   );

export const bimap = <E, A, G, B>(f: (e: E) => G, g: (a: A) => B) => <S1, S2, R>(
   pab: XPure<S1, S2, R, E, A>
): XPure<S1, S2, R, G, B> => bimap_(pab, f, g);

export const mapError_ = <S1, S2, R, E, A, G>(pab: XPure<S1, S2, R, E, A>, f: (e: E) => G): XPure<S1, S2, R, G, A> =>
   foldM_(pab, (e) => fail(f(e)), succeed);

export const mapError = <E, G>(f: (e: E) => G) => <S1, S2, R, A>(pab: XPure<S1, S2, R, E, A>): XPure<S1, S2, R, G, A> =>
   mapError_(pab, f);
