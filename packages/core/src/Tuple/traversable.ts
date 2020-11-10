import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { fst, snd } from "./destructors";
import { Functor } from "./functor";
import type { URI, V } from "./model";

export const traverse_: P.TraverseFn_<[URI], V> = P.implementTraverse_<[URI], V>()((_) => (G) => (ta, f) =>
   G.map_(f(fst(ta)), (b) => [b, snd(ta)])
);

export const traverse: P.TraverseFn<[URI], V> = (G) => {
   const traverseG_ = traverse_(G);
   return (f) => (ta) => traverseG_(ta, f);
};

export const sequence: P.SequenceFn<[URI], V> = P.implementSequence<[URI]>()((_) => (G) => (ta) =>
   G.map_(fst(ta), (a) => [a, snd(ta)])
);

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   traverse_,
   traverse,
   sequence
});
