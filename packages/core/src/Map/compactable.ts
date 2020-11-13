import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import { isLeft } from "../Either";
import type { Option } from "../Option";
import type { URI, V } from "./model";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/*
 * -------------------------------------------
 * Compactable Map
 * -------------------------------------------
 */

/**
 * @category Compactable
 * @since 1.0.0
 */
export function compact<K, A>(fa: ReadonlyMap<K, Option<A>>): ReadonlyMap<K, A> {
   const m = new Map<K, A>();
   const entries = fa.entries();
   let e: Next<readonly [K, Option<A>]>;
   while (!(e = entries.next()).done) {
      const [k, oa] = e.value;
      if (oa._tag === "Some") {
         m.set(k, oa.value);
      }
   }
   return m;
}

/**
 * @category Compactable
 * @since 1.0.0
 */
export function separate<K, A, B>(fa: ReadonlyMap<K, Either<A, B>>): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>> {
   const left = new Map<K, A>();
   const right = new Map<K, B>();
   const entries = fa.entries();
   let e: Next<readonly [K, Either<A, B>]>;
   // tslint:disable-next-line: strict-boolean-expressions
   while (!(e = entries.next()).done) {
      const [k, ei] = e.value;
      if (isLeft(ei)) {
         left.set(k, ei.left);
      } else {
         right.set(k, ei.right);
      }
   }
   return {
      left,
      right
   };
}

/**
 * @category Compactable
 * @since 1.0.0
 */
export const Compactable: P.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});
