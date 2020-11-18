import type { Predicate } from "../Function";

/*
 * -------------------------------------------
 * FreeSemigroup Model
 * -------------------------------------------
 */

export interface Empty {
  readonly _tag: "Empty";
}

export interface Element<A> {
  readonly _tag: "Element";
  readonly value: A;
}

export interface Combine<A> {
  readonly _tag: "Combine";
  readonly left: FreeMonoid<A>;
  readonly right: FreeMonoid<A>;
}

export interface Filter<A> {
  readonly _tag: "Filter";
  readonly fa: FreeMonoid<A>;
  readonly f: Predicate<A>;
}

export interface Map<A> {
  readonly _tag: "Map";
  readonly fa: FreeMonoid<A>;
  readonly f: (a: A) => A;
}

export type FreeMonoid<A> = Element<A> | Combine<A> | Filter<A> | Map<A> | Empty;
