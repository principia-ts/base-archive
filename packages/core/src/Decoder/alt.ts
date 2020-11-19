import type * as P from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as K from "../KleisliDecoder";
import type { Decoder, V } from "./model";

export function alt_<F extends HKT.URIS, C>(
  A: P.Alt<F, V<C>>
): <I, A>(me: Decoder<F, C, I, A>, that: () => Decoder<F, C, I, A>) => Decoder<F, C, I, A> {
  return (me, that) => ({
    decode: K.alt_(A)(me, that).decode,
    _meta: {
      name: `${me._meta.name} <!> ${that()._meta.name}`
    }
  });
}

export function alt<F extends HKT.URIS, C>(
  A: P.Alt<F, V<C>>
): <I, A>(that: () => Decoder<F, C, I, A>) => (me: Decoder<F, C, I, A>) => Decoder<F, C, I, A> {
  return (that) => (me) => alt_(A)(me, that);
}
