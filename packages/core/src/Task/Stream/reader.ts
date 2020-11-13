import * as T from "../Task";
import { fromTask } from "./constructors";
import { map_, mapM_ } from "./functor";
import type { RIO, Stream } from "./model";
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
