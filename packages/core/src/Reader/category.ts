import { flow, identity } from "../Function";
import type { Reader } from "./model";

/*
 * -------------------------------------------
 * Category Reader
 * -------------------------------------------
 */

export function compose_<R, A, B>(fa: Reader<R, A>, fb: Reader<A, B>): Reader<R, B> {
  return flow(fa, fb);
}

export function compose<A, B>(fb: Reader<A, B>): <R>(fa: Reader<R, A>) => Reader<R, B> {
  return (fa) => compose_(fa, fb);
}

export function id<R>(): Reader<R, R> {
  return identity;
}
