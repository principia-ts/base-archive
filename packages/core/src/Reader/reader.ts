import type { Reader } from "./model";

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): Reader<R, R> {
  return (r) => r;
}

export function asks<R, A>(f: (r: R) => A): Reader<R, A> {
  return f;
}

export function asksM<R, R1, A>(f: (r: R) => Reader<R1, A>): Reader<R & R1, A> {
  return (r) => f(r)(r);
}

export function gives_<Q, R, A>(ra: Reader<R, A>, f: (q: Q) => R): Reader<Q, A> {
  return (q) => ra(f(q));
}

export function gives<Q, R>(f: (q: Q) => R): <A>(ra: Reader<R, A>) => Reader<Q, A> {
  return (ra) => gives_(ra, f);
}

export function giveAll_<R, A>(ra: Reader<R, A>, r: R): Reader<unknown, A> {
  return () => ra(r);
}

export function giveAll<R>(r: R): <A>(ra: Reader<R, A>) => Reader<unknown, A> {
  return (ra) => giveAll_(ra, r);
}
