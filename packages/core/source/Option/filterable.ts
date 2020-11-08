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

export const filter_: {
   <A, B extends A>(fa: Option<A>, refinement: Refinement<A, B>): Option<B>;
   <A>(fa: Option<A>, predicate: Predicate<A>): Option<A>;
} = <A>(fa: Option<A>, predicate: Predicate<A>) => (isNone(fa) ? none() : predicate(fa.value) ? fa : none());

export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: Option<A>) => Option<B>;
   <A>(predicate: Predicate<A>): (fa: Option<A>) => Option<A>;
} = <A>(predicate: Predicate<A>) => (fa: Option<A>) => filter_(fa, predicate);

export const partition_: {
   <A, B extends A>(fa: Option<A>, refinement: Refinement<A, B>): Separated<Option<A>, Option<B>>;
   <A>(fa: Option<A>, predicate: Predicate<A>): Separated<Option<A>, Option<A>>;
} = <A>(fa: Option<A>, predicate: Predicate<A>): Separated<Option<A>, Option<A>> => ({
   left: filter_(fa, (a) => !predicate(a)),
   right: filter_(fa, predicate)
});

export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: Option<A>) => Separated<Option<A>, Option<B>>;
   <A>(predicate: Predicate<A>): (fa: Option<A>) => Separated<Option<A>, Option<A>>;
} = <A>(predicate: Predicate<A>) => (fa: Option<A>) => partition_(fa, predicate);

export const mapEither_ = <A, B, C>(fa: Option<A>, f: (a: A) => Either<B, C>): Separated<Option<B>, Option<C>> =>
   separate(map_(fa, f));

export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => (fa: Option<A>): Separated<Option<B>, Option<C>> =>
   mapEither_(fa, f);

/**
 * ```haskell
 * mapOption_ :: Filterable f => (f a, (a -> Option b)) -> f b
 * ```
 */
export const mapOption_ = <A, B>(fa: Option<A>, f: (a: A) => Option<B>): Option<B> =>
   isNone(fa) ? none() : f(fa.value);

/**
 * ```haskell
 * mapOption :: Filterable f => (a -> Option b) -> f a -> f b
 * ```
 */
export const mapOption = <A, B>(f: (a: A) => Option<B>) => (fa: Option<A>): Option<B> => mapOption_(fa, f);

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
