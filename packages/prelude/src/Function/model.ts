export interface Lazy<A> {
  (): A;
}

export interface Predicate<A> {
  (a: A): boolean;
}

export interface Refinement<A, B extends A> {
  (a: A): a is B;
}

export interface PredicateWithIndex<I, A> {
  (i: I, a: A): boolean;
}

export interface RefinementWithIndex<I, A, B extends A> {
  (i: I, a: A): a is B;
}

export interface Endomorphism<A> {
  (a: A): A;
}

export interface Morphism<A, B> {
  (a: A): B;
}

export interface FunctionN<A extends ReadonlyArray<unknown>, B> {
  (...args: A): B;
}
