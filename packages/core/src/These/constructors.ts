import * as O from "../Option";
import type { These } from "./model";

/*
 * -------------------------------------------
 * These Constructors
 * -------------------------------------------
 */

export function left<E = never, A = never>(left: E): These<E, A> {
  return { _tag: "Left", left };
}

export function right<E = never, A = never>(right: A): These<E, A> {
  return { _tag: "Right", right };
}

export function both<E, A>(left: E, right: A): These<E, A> {
  return { _tag: "Both", left, right };
}

export function rightOrThese_<E, A>(me: O.Option<E>, a: A): These<E, A> {
  return O.isNone(me) ? right(a) : both(me.value, a);
}

export function rightOrThese<A>(a: A): <E>(me: O.Option<E>) => These<E, A> {
  return (me) => rightOrThese_(me, a);
}

export function leftOrThese_<E, A>(me: O.Option<A>, e: E): These<E, A> {
  return O.isNone(me) ? left(e) : both(e, me.value);
}

export function leftOrThese<E>(e: E): <A>(me: O.Option<A>) => These<E, A> {
  return (me) => leftOrThese_(me, e);
}

export function fromOptions<E, A>(fe: O.Option<E>, fa: O.Option<A>): O.Option<These<E, A>> {
  return O.isNone(fe)
    ? O.isNone(fa)
      ? O.none()
      : O.some(right(fa.value))
    : O.isNone(fa)
    ? O.some(left(fe.value))
    : O.some(both(fe.value, fa.value));
}
