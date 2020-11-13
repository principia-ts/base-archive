import type { Eq } from "@principia/prelude/Eq";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import type { Predicate, Refinement } from "../Function";
import type { Option } from "../Option";
import { elem, elem_ } from "./guards";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/*
 * -------------------------------------------
 * Filterable Set
 * -------------------------------------------
 */

/**
 * @since 1.0.0
 */
export function filter_<A, B extends A>(fa: ReadonlySet<A>, refinement: Refinement<A, B>): ReadonlySet<B>;
export function filter_<A>(fa: ReadonlySet<A>, predicate: Predicate<A>): ReadonlySet<A>;
export function filter_<A>(fa: ReadonlySet<A>, predicate: Predicate<A>) {
   const values = fa.values();
   let e: Next<A>;
   const r = new Set<A>();
   while (!(e = values.next()).done) {
      const value = e.value;
      if (predicate(value)) {
         r.add(value);
      }
   }
   return r;
}

/**
 * @since 1.0.0
 */
export function partition_<A, B extends A>(
   fa: ReadonlySet<A>,
   refinement: Refinement<A, B>
): Separated<ReadonlySet<A>, ReadonlySet<B>>;
export function partition_<A>(fa: ReadonlySet<A>, predicate: Predicate<A>): Separated<ReadonlySet<A>, ReadonlySet<A>>;
export function partition_<A>(fa: ReadonlySet<A>, predicate: Predicate<A>) {
   const values = fa.values();
   let e: Next<A>;
   const right = new Set<A>();
   const left = new Set<A>();
   while (!(e = values.next()).done) {
      const value = e.value;
      if (predicate(value)) {
         right.add(value);
      } else {
         left.add(value);
      }
   }
   return { left, right };
}

/**
 * @since 1.0.0
 */
export function partition<A, B extends A>(
   refinement: Refinement<A, B>
): (fa: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<B>>;
export function partition<A>(
   predicate: Predicate<A>
): (fa: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<A>>;
export function partition<A>(
   predicate: Predicate<A>
): (fa: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<A>> {
   return (fa) => partition_(fa, predicate);
}

/**
 * @since 1.0.0
 */
export function mapEither_<B, C>(EB: Eq<B>, EC: Eq<C>) {
   return <A>(set: ReadonlySet<A>, f: (a: A) => Either<B, C>): Separated<ReadonlySet<B>, ReadonlySet<C>> => {
      const values = set.values();
      let e: Next<A>;
      const left = new Set<B>();
      const right = new Set<C>();
      const hasB = elem(EB);
      const hasC = elem(EC);
      while (!(e = values.next()).done) {
         const v = f(e.value);
         switch (v._tag) {
            case "Left":
               if (!hasB(v.left)(left)) {
                  left.add(v.left);
               }
               break;
            case "Right":
               if (!hasC(v.right)(right)) {
                  right.add(v.right);
               }
               break;
         }
      }
      return { left, right };
   };
}

/**
 * @since 1.0.0
 */
export function mapEither<B, C>(
   EB: Eq<B>,
   EC: Eq<C>
): <A>(f: (a: A) => Either<B, C>) => (set: ReadonlySet<A>) => Separated<ReadonlySet<B>, ReadonlySet<C>> {
   return (f) => (set) => mapEither_(EB, EC)(set, f);
}

/**
 * @since 1.0.0
 */
export function mapOption_<B>(E: Eq<B>) {
   const elemE_ = elem_(E);
   return <A>(fa: ReadonlySet<A>, f: (a: A) => Option<B>) => {
      const r: Set<B> = new Set();
      fa.forEach((a) => {
         const ob = f(a);
         if (ob._tag === "Some" && !elemE_(r, ob.value)) {
            r.add(ob.value);
         }
      });
      return r;
   };
}

/**
 * @since 1.0.0
 */
export function mapOption<B>(E: Eq<B>) {
   const filterMapE_ = mapOption_(E);
   return <A>(f: (a: A) => Option<B>) => (fa: ReadonlySet<A>) => filterMapE_(fa, f);
}
