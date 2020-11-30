import * as I from "../IO";
import * as M from "../Managed";
import { fromEffect } from "./constructors";
import { map_, mapM_ } from "./functor";
import type { RIO } from "./model";
import { Stream } from "./model";
import { chain_ } from "./monad";

/**
 * Accesses the whole environment of the stream.
 */
export function ask<R>(): RIO<R, R> {
  return fromEffect(I.ask<R>());
}

/**
 * Accesses the environment of the stream.
 */
export function asks<R, A>(f: (_: R) => A): Stream<R, never, A> {
  return map_(ask(), f);
}

/**
 * Accesses the environment of the stream in the context of an IO.
 */
export function asksM<R0, R, E, A>(f: (_: R0) => I.IO<R, E, A>): Stream<R & R0, E, A> {
  return mapM_(ask<R0>(), f);
}

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function asksStream<R0, R, E, A>(f: (_: R0) => Stream<R, E, A>): Stream<R0 & R, E, A> {
  return chain_(ask<R0>(), f);
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, O>(ra: Stream<R, E, O>, r: R): Stream<unknown, E, O> {
  return new Stream(M.map_(M.giveAll_(ra.proc, r), I.giveAll(r)));
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll<R>(r: R): <E, O>(ra: Stream<R, E, O>) => Stream<unknown, E, O> {
  return (ra) => giveAll_(ra, r);
}
