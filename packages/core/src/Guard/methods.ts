import type { Guard } from "./model";
/*
 * -------------------------------------------
 * Guard Methods
 * -------------------------------------------
 */

export function alt_<I, A extends I>(me: Guard<I, A>, that: () => Guard<I, A>): Guard<I, A> {
  return {
    is: (i): i is A => me.is(i) || that().is(i)
  };
}

export function alt<I, A extends I>(that: () => Guard<I, A>): (me: Guard<I, A>) => Guard<I, A> {
  return (me) => alt_(me, that);
}

export function zero<I, A extends I>(): Guard<I, A> {
  return {
    is: (_): _ is A => false
  };
}

export function compose_<I, A extends I, B extends A>(
  from: Guard<I, A>,
  to: Guard<A, B>
): Guard<I, B> {
  return {
    is: (i): i is B => from.is(i) && to.is(i)
  };
}

export function compose<I, A extends I, B extends A>(
  to: Guard<A, B>
): (from: Guard<I, A>) => Guard<I, B> {
  return (from) => compose_(from, to);
}

export function id<A>(): Guard<A, A> {
  return {
    is: (_): _ is A => true
  };
}
