import * as T from "../Task";
import { fromTask } from "./constructors";
import { map_, mapM_ } from "./functor";
import type { RIO, Stream } from "./model";
import { chain_ } from "./monad";

export const ask = <R>(): RIO<R, R> => fromTask(T.ask<R>());

export const asks = <R, A>(f: (_: R) => A): Stream<R, never, A> => map_(ask(), f);

export const asksM = <R0, R, E, A>(f: (_: R0) => T.Task<R, E, A>): Stream<R & R0, E, A> => mapM_(ask<R0>(), f);

export const asksStream = <R0, R, E, A>(f: (_: R0) => Stream<R, E, A>) => chain_(ask<R0>(), f);
