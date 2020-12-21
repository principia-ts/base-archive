import type { Lazy, Predicate } from "./model";

/**
 * @optimize identity
 */
export function identity<A>(a: A) {
  return a;
}

/**
 * @optimize identity
 */
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

export const hole: <T>() => T = absurd as any;
