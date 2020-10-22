import type { Predicate } from "../Function";

/*
 * -------------------------------------------
 * FreeSemigroup Model
 * -------------------------------------------
 */

export interface Empty {
   readonly _tag: "Empty";
}

export interface Pure<A> {
   readonly _tag: "Element";
   readonly value: A;
}

export interface Combine<A> {
   readonly _tag: "Combine";
   readonly left: FreeSemigroup<A>;
   readonly right: FreeSemigroup<A>;
}

export interface Filter<A> {
   readonly _tag: "Filter";
   readonly fa: FreeSemigroup<A>;
   readonly f: Predicate<A>;
}

export interface Map<A> {
   readonly _tag: "Map";
   readonly fa: FreeSemigroup<A>;
   readonly f: (a: A) => A;
}

export type FreeSemigroup<A> = Pure<A> | Combine<A> | Filter<A> | Map<A> | Empty;
