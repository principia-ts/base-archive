import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { fst, snd } from "./destructors";
import type { Tuple, URI, V } from "./model";

export const compose_ = <B, A, C>(ab: Tuple<B, A>, bc: Tuple<C, B>): Tuple<C, A> => [fst(bc), snd(ab)];

export const compose = <C, B>(bc: Tuple<C, B>) => <A>(ab: Tuple<B, A>): Tuple<C, A> => compose_(ab, bc);

export const Semigroupoid: P.Semigroupoid<[URI], V> = HKT.instance({
   compose_,
   compose
});
