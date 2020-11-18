import { fst, snd } from "./destructors";
import type { Tuple } from "./model";

export function bimap_<A, I, G, B>(pab: Tuple<A, I>, f: (i: I) => G, g: (a: A) => B): Tuple<B, G> {
  return [g(fst(pab)), f(snd(pab))];
}

export function bimap<I, G, A, B>(
  f: (i: I) => G,
  g: (a: A) => B
): (pab: Tuple<A, I>) => Tuple<B, G> {
  return (pab) => bimap_(pab, f, g);
}

export function first_<A, I, G>(pab: Tuple<A, I>, f: (i: I) => G): Tuple<A, G> {
  return [fst(pab), f(snd(pab))];
}

export function first<I, G>(f: (i: I) => G): <A>(pab: Tuple<A, I>) => Tuple<A, G> {
  return (pab) => first_(pab, f);
}
