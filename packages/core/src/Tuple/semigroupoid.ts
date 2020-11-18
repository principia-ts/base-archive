import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { fst, snd } from "./destructors";
import type { Tuple, URI, V } from "./model";

export function compose_<B, A, C>(ab: Tuple<B, A>, bc: Tuple<C, B>): Tuple<C, A> {
  return [fst(bc), snd(ab)];
}

export function compose<C, B>(bc: Tuple<C, B>): <A>(ab: Tuple<B, A>) => Tuple<C, A> {
  return (ab) => compose_(ab, bc);
}

export const Semigroupoid: P.Semigroupoid<[URI], V> = HKT.instance({
  compose_,
  compose
});
