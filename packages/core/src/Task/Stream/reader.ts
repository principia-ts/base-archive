import * as M from "../Managed";
import * as T from "../Task";
import { fromTask } from "./constructors";
import { map_, mapM_ } from "./functor";
import type { RIO } from "./model";
import { Stream } from "./model";
import { chain_ } from "./monad";

export function ask<R>(): RIO<R, R> {
  return fromTask(T.ask<R>());
}

export function asks<R, A>(f: (_: R) => A): Stream<R, never, A> {
  return map_(ask(), f);
}

export function asksM<R0, R, E, A>(f: (_: R0) => T.Task<R, E, A>): Stream<R & R0, E, A> {
  return mapM_(ask<R0>(), f);
}

export function asksStream<R0, R, E, A>(f: (_: R0) => Stream<R, E, A>): Stream<R0 & R, E, A> {
  return chain_(ask<R0>(), f);
}

export function giveAll_<R, E, O>(ra: Stream<R, E, O>, r: R): Stream<unknown, E, O> {
  return new Stream(M.map_(M.giveAll_(ra.proc, r), T.giveAll(r)));
}

export function giveAll<R>(r: R): <E, O>(ra: Stream<R, E, O>) => Stream<unknown, E, O> {
  return (ra) => giveAll_(ra, r);
}
