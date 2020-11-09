import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { fst, snd } from "./destructors";
import { Functor } from "./functor";
import type { Tuple, URI, V } from "./model";

export const extend_ = <A, I, B>(wa: Tuple<A, I>, f: (wa: Tuple<A, I>) => B): Tuple<B, I> => [f(wa), snd(wa)];

export const extend = <A, I, B>(f: (wa: Tuple<A, I>) => B) => (wa: Tuple<A, I>): Tuple<B, I> => extend_(wa, f);

export const extract: <A, I>(wa: Tuple<A, I>) => A = fst;

export const duplicate: <A, I>(wa: Tuple<A, I>) => Tuple<Tuple<A, I>, I> = extend(identity);

export const Comonad: P.Comonad<[URI], V> = HKT.instance({
   ...Functor,
   extend_,
   extend,
   extract
});
