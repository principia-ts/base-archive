import type * as P from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import type { Decoder, V } from "./model";

export function map_<F extends HKT.URIS, C>(
  F: P.Functor<F, V<C>>
): <I, A, B>(ia: Decoder<F, C, I, A>, f: (a: A) => B) => Decoder<F, C, I, B> {
  return (ia, f) => ({
    decode: (i) => F.map_(ia.decode(i), f),
    _meta: {
      name: ia._meta.name
    }
  });
}

export function map<F extends HKT.URIS, C>(
  F: P.Functor<F, V<C>>
): <A, B>(f: (a: A) => B) => <I>(ia: Decoder<F, C, I, A>) => Decoder<F, C, I, B> {
  return (f) => (ia) => map_(F)(ia, f);
}
