import { pipe } from "../Function";
import type * as HKT from "../HKT";
import type { EnforceNonEmptyRecord } from "../Utils";
import type { Apply } from "./Apply";
import { getRecordConstructor } from "./utils";

export function sequenceS<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>) {
   return <KS extends Record<string, HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>>>(
      r: EnforceNonEmptyRecord<KS> & Record<string, HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>>
   ): SequencedS<KS, F, C> => {
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

type SequencedS<
   KS extends Record<string, HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>>,
   F extends HKT.URIS,
   C
> = HKT.Kind<
   F,
   C,
   HKT.MixStruct<C, "N", string, { [K in keyof KS]: HKT.Infer<F, "N", KS[K]> }>,
   HKT.MixStruct<C, "K", never, { [K in keyof KS]: HKT.Infer<F, "K", KS[K]> }>,
   HKT.MixStruct<C, "Q", never, { [K in keyof KS]: HKT.Infer<F, "Q", KS[K]> }>,
   HKT.MixStruct<C, "W", never, { [K in keyof KS]: HKT.Infer<F, "W", KS[K]> }>,
   HKT.MixStruct<C, "X", never, { [K in keyof KS]: HKT.Infer<F, "X", KS[K]> }>,
   HKT.MixStruct<C, "I", never, { [K in keyof KS]: HKT.Infer<F, "I", KS[K]> }>,
   HKT.MixStruct<C, "S", never, { [K in keyof KS]: HKT.Infer<F, "S", KS[K]> }>,
   HKT.MixStruct<C, "R", never, { [K in keyof KS]: HKT.Infer<F, "R", KS[K]> }>,
   HKT.MixStruct<C, "E", never, { [K in keyof KS]: HKT.Infer<F, "E", KS[K]> }>,
   {
      [K in keyof KS]: HKT.Infer<F, "A", KS[K]>;
   }
>;
