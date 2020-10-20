import type { Guard } from "./Guard";
/*
 * -------------------------------------------
 * Guard Methods
 * -------------------------------------------
 */

export const alt_ = <I, A extends I>(me: Guard<I, A>, that: () => Guard<I, A>): Guard<I, A> => ({
   is: (i): i is A => me.is(i) || that().is(i)
});

export const alt = <I, A extends I>(that: () => Guard<I, A>) => (me: Guard<I, A>): Guard<I, A> => alt_(me, that);

export const zero = <I, A extends I>(): Guard<I, A> => ({
   is: (_): _ is A => false
});

export const compose_ = <I, A extends I, B extends A>(from: Guard<I, A>, to: Guard<A, B>): Guard<I, B> => ({
   is: (i): i is B => from.is(i) && to.is(i)
});

export const compose = <I, A extends I, B extends A>(to: Guard<A, B>) => (from: Guard<I, A>): Guard<I, B> =>
   compose_(from, to);

export const id = <A>(): Guard<A, A> => ({
   is: (_): _ is A => true
});
