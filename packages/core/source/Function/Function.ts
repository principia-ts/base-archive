import type * as HKT from "../HKT";

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

export function identity<A>(a: A) {
   return a;
}

export const unsafeCoerce: <A, B>(a: A) => B = identity as any;

export function not<A>(predicate: Predicate<A>): Predicate<A> {
   return (a) => !predicate(a);
}

export function constant<A>(a: A): Lazy<A> {
   return () => a;
}

export const constTrue: Lazy<true> = () => true;

export const constFale: Lazy<false> = () => false;

export const constNull: Lazy<null> = () => null;

export const constUndefined: Lazy<undefined> = () => undefined;

export const constVoid: Lazy<void> = () => {
   return;
};

export function tuple<T extends ReadonlyArray<any>>(...t: T): readonly [...T] {
   return t;
}

export function increment(n: number): number {
   return n + 1;
}

export function decrement(n: number): number {
   return n - 1;
}

export function absurd<A>(_: never): A {
   throw new Error("Called `absurd` function, which should be uncallable.");
}

export function tupled<A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): (a: A) => B {
   return (a) => f(...a);
}

export function untupled<A extends ReadonlyArray<unknown>, B>(f: (a: A) => B): (...a: A) => B {
   return (...a) => f(a);
}

export interface FlipF {
   <A, B, C>(f: (a: A) => (b: B) => C): (b: B) => (a: A) => C;
}

/**
 * flip :: (a -> b -> c) -> b -> a -> c
 * Flips the arguments of a curried binary function
 */
export const flip: FlipF = (f: any) => (b: any) => (a: any) => f(a)(b);

export const hole: <T>() => T = absurd as any;

export const matchPredicate: {
   <A, B extends A, C>(refinement: Refinement<A, B>, onTrue: (a: B) => C, onFalse: (a: A) => C): (a: A) => C;
   <A, B>(predicate: Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => B): (a: A) => B;
} = <A, B>(predicate: Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => B) => (a: A) =>
   predicate(a) ? onTrue(a) : onFalse(a);
