import { fail, succeed } from "./constructors";
import { foldM_ } from "./fold";
import type { SIO } from "./model";

/*
 * -------------------------------------------
 * Bifunctor SIO
 * -------------------------------------------
 */

export function bimap_<S1, S2, R, E, A, G, B>(
  pab: SIO<S1, S2, R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): SIO<S1, S2, R, G, B> {
  return foldM_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  );
}

export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <S1, S2, R>(pab: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, G, B> {
  return (pab) => bimap_(pab, f, g);
}

export function mapError_<S1, S2, R, E, A, G>(
  pab: SIO<S1, S2, R, E, A>,
  f: (e: E) => G
): SIO<S1, S2, R, G, A> {
  return foldM_(pab, (e) => fail(f(e)), succeed);
}

export function mapError<E, G>(
  f: (e: E) => G
): <S1, S2, R, A>(pab: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, G, A> {
  return (pab) => mapError_(pab, f);
}
