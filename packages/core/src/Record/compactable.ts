import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Either } from "../Either";
import type { Option } from "../Option";
import { isSome } from "../Option";
import type { ReadonlyRecord, URI, V } from "./model";
import { keys } from "./utils";

/*
 * -------------------------------------------
 * Compactable Record
 * -------------------------------------------
 */

/**
 * ```haskell
 * separate :: Compactable c => c (Either a b) -> Separated (c a) (c b)
 * ```
 */
export const separate = <N extends string, A, B>(fa: ReadonlyRecord<N, Either<A, B>>) => {
   const left: Record<string, A> = {} as any;
   const right: Record<string, B> = {} as any;
   const keys = Object.keys(fa);
   for (const key of keys) {
      const e = fa[key];
      switch (e.tag_) {
         case "Left":
            left[key] = e.left;
            break;
         case "Right":
            right[key] = e.right;
            break;
      }
   }
   return {
      left,
      right
   };
};

/**
 * ```haskell
 * compact :: Compactable c => c (Option a) -> c a
 * ```
 */
export const compact = <N extends string, A>(fa: ReadonlyRecord<N, Option<A>>) => {
   const r: Record<string, A> = {} as any;
   const ks = keys(fa);
   for (const key of ks) {
      const optionA = fa[key];
      if (isSome(optionA)) {
         r[key] = optionA.value;
      }
   }
   return r;
};

export const Compactable: P.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});
