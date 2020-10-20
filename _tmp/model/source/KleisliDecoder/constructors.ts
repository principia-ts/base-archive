import type { Refinement } from "@principia/core/Function";
import type * as P from "@principia/prelude";
import { pureF } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import type { KleisliDecoder } from "./KleisliDecoder";

export const fromRefinement = <E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
) => <
   I0,
   A extends I0,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   refinement: Refinement<I0, A>,
   onError: (i: I0) => E
): KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A> => ({
   decode: (i) => (refinement(i) ? pureF(M)(i) : M.fail(onError(i)))
});
