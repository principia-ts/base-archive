import type * as HKT from "../HKT";
import type { Apply } from "./Apply";
import { tupleF } from "./TupleFn";
import type { InferMixTuple } from "./utils";

export interface MapNFn<F extends HKT.URIS, TC = HKT.Auto> {
   <
      KT extends readonly [
         HKT.Kind<
            F,
            TC,
            HKT.Intro<TC, "N", N, any>,
            HKT.Intro<TC, "K", K, any>,
            HKT.Intro<TC, "Q", Q, any>,
            HKT.Intro<TC, "W", W, any>,
            HKT.Intro<TC, "X", X, any>,
            HKT.Intro<TC, "I", I, any>,
            HKT.Intro<TC, "S", S, any>,
            HKT.Intro<TC, "R", R, any>,
            HKT.Intro<TC, "E", E, any>,
            unknown
         >,
         ...ReadonlyArray<
            HKT.Kind<
               F,
               TC,
               HKT.Intro<TC, "N", N, any>,
               HKT.Intro<TC, "K", K, any>,
               HKT.Intro<TC, "Q", Q, any>,
               HKT.Intro<TC, "W", W, any>,
               HKT.Intro<TC, "X", X, any>,
               HKT.Intro<TC, "I", I, any>,
               HKT.Intro<TC, "S", S, any>,
               HKT.Intro<TC, "R", R, any>,
               HKT.Intro<TC, "E", E, any>,
               unknown
            >
         >
      ],
      B,
      N extends string = HKT.Initial<TC, "N">,
      K = HKT.Initial<TC, "K">,
      Q = HKT.Initial<TC, "Q">,
      W = HKT.Initial<TC, "W">,
      X = HKT.Initial<TC, "X">,
      I = HKT.Initial<TC, "I">,
      S = HKT.Initial<TC, "S">,
      R = HKT.Initial<TC, "R">,
      E = HKT.Initial<TC, "E">
   >(
      f: (...as: readonly [...{ [K in keyof KT]: HKT.Infer<F, TC, "A", KT[K]> }]) => B
   ): (
      ...t: readonly [...KT]
   ) => HKT.Kind<
      F,
      TC,
      InferMixTuple<F, TC, "N", N, KT>,
      InferMixTuple<F, TC, "K", K, KT>,
      InferMixTuple<F, TC, "Q", Q, KT>,
      InferMixTuple<F, TC, "W", W, KT>,
      InferMixTuple<F, TC, "X", X, KT>,
      InferMixTuple<F, TC, "I", I, KT>,
      InferMixTuple<F, TC, "S", S, KT>,
      InferMixTuple<F, TC, "R", R, KT>,
      InferMixTuple<F, TC, "E", E, KT>,
      B
   >;
}

/**
 * ```haskell
 * mapNF :: Apply f => ([a, b, ...] -> c) -> [f a, f b, ...] -> f c
 * ```
 *
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF<F extends HKT.URIS, C = HKT.Auto>(A: Apply<F, C>): MapNFn<F, C>;
export function mapNF<F>(F: Apply<HKT.UHKT<F>>): MapNFn<HKT.UHKT<F>> {
   return (f) => (...t) => F.map_(tupleF(F)(...(t as any)), (as) => f(...(as as any)));
}
