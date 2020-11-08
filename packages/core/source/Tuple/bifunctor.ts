import { fst, snd } from "./destructors";
import type { Tuple } from "./model";

export const bimap_ = <A, E, G, B>(pab: Tuple<A, E>, f: (e: E) => G, g: (a: A) => B): Tuple<B, G> =>
   [g(fst(pab)), f(snd(pab))] as const;

export const bimap = <E, G, A, B>(f: (e: E) => G, g: (a: A) => B) => (pab: Tuple<A, E>): Tuple<B, G> =>
   bimap_(pab, f, g);

export const first_ = <A, E, G>(pab: Tuple<A, E>, f: (e: E) => G): Tuple<A, G> => [fst(pab), f(snd(pab))] as const;

export const first = <E, G>(f: (e: E) => G) => <A>(pab: Tuple<A, E>): Tuple<A, G> => first_(pab, f);
