import type * as P from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as DE from "../DecodeError";
import type { Guard } from "../Guard";
import * as K from "../KleisliDecoder";
import type { Literal } from "../Utils";
import type { Decoder, V } from "./model";

export function fromRefinement<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <I, A extends I>(
  refinement: P.Refinement<I, A>,
  expected: string,
  info?: DE.ErrorInfo
) => Decoder<M, C, I, A> {
  return (refinement, expected, info) => ({
    decode: K.fromRefinement(M)(refinement, (i) => DE.error(i, expected, info)).decode,
    _meta: {
      name: expected
    }
  });
}

export function fromGuard<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <I, A extends I>(
  guard: Guard<I, A>,
  expected: string,
  info?: DE.ErrorInfo
) => Decoder<M, C, I, A> {
  return (guard, expected, info) => fromRefinement(M)(guard.is, expected, info);
}

export function literal<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <A extends readonly [Literal, ...Array<Literal>]>(
  ...values: A
) => (info?: DE.ErrorInfo) => Decoder<M, C, unknown, A[number]> {
  return (...values) => {
    const name = values.map((value) => JSON.stringify(value)).join(" | ");
    return (info) => ({
      decode: K.literal(M)((u, _) => DE.error(u, name, info))(...values).decode,
      _meta: {
        name
      }
    });
  };
}
