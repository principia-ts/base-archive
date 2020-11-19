import type * as P from "@principia/prelude";
import { pureF } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as K from "../KleisliDecoder";
import type { Decoder, V } from "./model";

export function compose_<M extends HKT.URIS, C>(
  M: P.Monad<M, V<C>>
): <I, A, B>(from: Decoder<M, C, I, A>, to: Decoder<M, C, A, B>) => Decoder<M, C, I, B> {
  return (from, to) => ({
    decode: K.compose_(M)(from, to).decode,
    _meta: {
      name: `(${from._meta.name} >>> ${to._meta.name})`
    }
  });
}

export function compose<M extends HKT.URIS, C>(
  M: P.Monad<M, V<C>>
): <A, B>(to: Decoder<M, C, A, B>) => <I>(from: Decoder<M, C, I, A>) => Decoder<M, C, I, B> {
  return (to) => (from) => compose_(M)(from, to);
}

export function id<M extends HKT.URIS, C>(M: P.Applicative<M, V<C>>): <A>() => Decoder<M, C, A, A> {
  return () => ({
    decode: pureF(M),
    _meta: {
      name: "id"
    }
  });
}
