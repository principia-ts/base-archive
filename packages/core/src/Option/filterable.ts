import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import type { Predicate, Refinement } from "../Function";
import { separate } from "./compactable";
import { none } from "./constructors";
import { map_ } from "./functor";
import { isNone } from "./guards";
import type { Option, URI, V } from "./model";

/*
 * -------------------------------------------
 * Filterable Option
 * -------------------------------------------
 */

export function filter_<A, B extends A>(fa: Option<A>, refinement: Refinement<A, B>): Option<B>;
export function filter_<A>(fa: Option<A>, predicate: Predicate<A>): Option<A>;
export function filter_<A>(fa: Option<A>, predicate: Predicate<A>): Option<A> {
   return isNone(fa) ? none() : predicate(fa.value) ? fa : none();
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: Option<A>) => Option<B>;
export function filter<A>(predicate: Predicate<A>): (fa: Option<A>) => Option<A>;
export function filter<A>(predicate: Predicate<A>): (fa: Option<A>) => Option<A> {
   return (fa) => filter_(fa, predicate);
}

export function partition_<A, B extends A>(
   fa: Option<A>,
   refinement: Refinement<A, B>
): Separated<Option<A>, Option<B>>;
export function partition_<A>(fa: Option<A>, predicate: Predicate<A>): Separated<Option<A>, Option<A>>;
export function partition_<A>(fa: Option<A>, predicate: Predicate<A>): Separated<Option<A>, Option<A>> {
   return {
      left: filter_(fa, (a) => !predicate(a)),
      right: filter_(fa, predicate)
   };
}

export function partition<A, B extends A>(
   refinement: Refinement<A, B>
): (fa: Option<A>) => Separated<Option<A>, Option<B>>;
export function partition<A>(predicate: Predicate<A>): (fa: Option<A>) => Separated<Option<A>, Option<A>>;
export function partition<A>(predicate: Predicate<A>): (fa: Option<A>) => Separated<Option<A>, Option<A>> {
   return (fa) => partition_(fa, predicate);
}

export function mapEither_<A, B, C>(fa: Option<A>, f: (a: A) => Either<B, C>): Separated<Option<B>, Option<C>> {
   return separate(map_(fa, f));
}

export function mapEither<A, B, C>(f: (a: A) => Either<B, C>): (fa: Option<A>) => Separated<Option<B>, Option<C>> {
   return (fa) => mapEither_(fa, f);
}

/**
 * ```haskell
 * mapOption_ :: Filterable f => (f a, (a -> Option b)) -> f b
 * ```
 */
export function mapOption_<A, B>(fa: Option<A>, f: (a: A) => Option<B>): Option<B> {
   return isNone(fa) ? none() : f(fa.value);
}

/**
 * ```haskell
 * mapOption :: Filterable f => (a -> Option b) -> f a -> f b
 * ```
 */
export function mapOption<A, B>(f: (a: A) => Option<B>): (fa: Option<A>) => Option<B> {
   return (fa) => mapOption_(fa, f);
}

export const Filterable: P.Filterable<[URI], V> = HKT.instance({
   mapOption_,
   filter_,
   mapEither_,
   partition_,
   filter,
   mapOption,
   partition,
   mapEither
});
