import { identity } from "@principia/prelude";

import * as T from "../_internal/task";
import { Managed } from "../model";

export const orDieWith_ = <R, E, A>(ma: Managed<R, E, A>, f: (e: E) => unknown): Managed<R, never, A> =>
   new Managed(T.orDieWith_(ma.task, f));

export const orDieWith = <E>(f: (e: E) => unknown) => <R, A>(ma: Managed<R, E, A>): Managed<R, never, A> =>
   orDieWith_(ma, f);

export const orDie = <R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> => orDieWith_(ma, identity);
