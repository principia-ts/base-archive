import { fst, snd } from "./destructors";
import type { Tuple } from "./model";

export const bimap_ = <A, I, G, B>(pab: Tuple<A, I>, f: (i: I) => G, g: (a: A) => B): Tuple<B, G> => [
   g(fst(pab)),
   f(snd(pab))
];

export const bimap = <I, G, A, B>(f: (i: I) => G, g: (a: A) => B) => (pab: Tuple<A, I>): Tuple<B, G> =>
   bimap_(pab, f, g);

export const first_ = <A, I, G>(pab: Tuple<A, I>, f: (i: I) => G): Tuple<A, G> => [fst(pab), f(snd(pab))];

export const first = <I, G>(f: (i: I) => G) => <A>(pab: Tuple<A, I>): Tuple<A, G> => first_(pab, f);
