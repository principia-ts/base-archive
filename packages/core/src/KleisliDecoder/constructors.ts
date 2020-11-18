import type * as P from "@principia/prelude";
import { pureF } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import type { Refinement } from "../Function";
import * as G from "../Guard";
import type { Literal } from "../Utils";
import type { KleisliDecoder } from "./model";

export function fromRefinement<E, M extends HKT.URIS, C>(
  M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): <I, A extends I>(
  refinement: P.Refinement<I, A>,
  onError: (i: I) => E
) => KleisliDecoder<M, C, I, E, A> {
  return (refinement, onError) => ({
    decode: (i) => (refinement(i) ? pureF(M)(i) : M.fail(onError(i)))
  });
}

export function literal<E, M extends HKT.URIS, C>(M: P.MonadFail<M, C & HKT.Fix<"E", E>>) {
  return <I>(onError: (i: I, values: readonly [Literal, ...Literal[]]) => E) => <
    A extends readonly [Literal, ...Literal[]]
  >(
    ...values: A
  ): KleisliDecoder<M, C, I, E, A[number]> => ({
    decode: (i) =>
      G.literal(...values).is(i) ? pureF(M)(i as A[number]) : M.fail(onError(i, values))
  });
}
