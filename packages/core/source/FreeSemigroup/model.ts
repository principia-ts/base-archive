import type { Semigroup } from "@principia/prelude/Semigroup";
import { fromCombine } from "@principia/prelude/Semigroup";

/*
 * -------------------------------------------
 * FreeSemigroup Model
 * -------------------------------------------
 */

export interface Element<A> {
   readonly _tag: "Element";
   readonly value: A;
}

export interface Combine<A> {
   readonly _tag: "Combine";
   readonly left: FreeSemigroup<A>;
   readonly right: FreeSemigroup<A>;
}

export type FreeSemigroup<A> = Element<A> | Combine<A>;

/*
 * -------------------------------------------
 * FreeSemigroup Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export const combine = <A>(left: FreeSemigroup<A>, right: FreeSemigroup<A>): FreeSemigroup<A> => ({
   _tag: "Combine",
   left,
   right
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const element = <A>(a: A): FreeSemigroup<A> => ({
   _tag: "Element",
   value: a
});

/*
 * -------------------------------------------
 * FreeSemigroup Destructors
 * -------------------------------------------
 */

/**
 * @category Destructors
 * @since 1.0.0
 */
export const fold = <A, R>(onOf: (value: A) => R, onConcat: (left: FreeSemigroup<A>, right: FreeSemigroup<A>) => R) => (
   f: FreeSemigroup<A>
): R => {
   switch (f._tag) {
      case "Element":
         return onOf(f.value);
      case "Combine":
         return onConcat(f.left, f.right);
   }
};

/*
 * -------------------------------------------
 * FreeSemigroup Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <A = never>(): Semigroup<FreeSemigroup<A>> => fromCombine(combine);
