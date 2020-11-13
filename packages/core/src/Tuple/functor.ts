import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { fst, snd } from "./destructors";
import type { Tuple, URI, V } from "./model";

export function map_<A, I, B>(fa: Tuple<A, I>, f: (a: A) => B): Tuple<B, I> {
   return [f(fst(fa)), snd(fa)];
}

export function map<A, B>(f: (a: A) => B): <I>(fa: Tuple<A, I>) => Tuple<B, I> {
   return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_
});
