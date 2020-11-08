import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { fst, snd } from "./destructors";
import type { Tuple, URI } from "./model";

export const map_ = <A, E, B>(fa: Tuple<A, E>, f: (a: A) => B): Tuple<B, E> => [f(fst(fa)), snd(fa)];

export const map = <A, B>(f: (a: A) => B) => <E>(fa: Tuple<A, E>): Tuple<B, E> => map_(fa, f);

export const Functor: P.Functor<[URI]> = HKT.instance({
   map,
   map_
});
