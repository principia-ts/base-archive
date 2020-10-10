import { pipe } from "../Function";
import type * as HKT from "../HKT";
import type { EnforceNonEmptyRecord } from "../Utils";
import type { Apply } from "./Apply";
import type { InferMixStruct } from "./utils";
import { getRecordConstructor } from "./utils";

export interface SequenceSFn<F extends HKT.URIS, TC = HKT.Auto> {
   <
      KS extends Readonly<
         Record<
            string,
            HKT.Kind<
               F,
               TC,
               string,
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
      >,
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
      r: EnforceNonEmptyRecord<KS> &
         Readonly<
            Record<
               string,
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
         >
   ): HKT.Kind<
      F,
      TC,
      InferMixStruct<F, TC, "N", N, KS>,
      InferMixStruct<F, TC, "K", K, KS>,
      InferMixStruct<F, TC, "Q", Q, KS>,
      InferMixStruct<F, TC, "W", W, KS>,
      InferMixStruct<F, TC, "X", X, KS>,
      InferMixStruct<F, TC, "I", I, KS>,
      InferMixStruct<F, TC, "S", S, KS>,
      InferMixStruct<F, TC, "R", R, KS>,
      InferMixStruct<F, TC, "E", E, KS>,
      {
         [K in keyof KS]: HKT.Infer<F, "A", KS[K]>;
      }
   >;
}

export function sequenceSF<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>): SequenceSFn<F, C>;
export function sequenceSF<F>(F: Apply<HKT.UHKT<F>>): SequenceSFn<HKT.UHKT<F>> {
   return (r) => {
      const keys = Object.keys(r);
      const len = keys.length;
      const f = getRecordConstructor(keys);
      let fr = pipe(r[keys[0]], F.map(f));
      for (let i = 1; i < len; i++) {
         fr = pipe(fr, F.ap(r[keys[i]])) as any;
      }
      return fr;
   };
}
