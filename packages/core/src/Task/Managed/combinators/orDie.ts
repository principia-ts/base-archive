import { identity } from "@principia/prelude";

import * as T from "../_internal/task";
import { Managed } from "../model";

export function orDieWith_<R, E, A>(ma: Managed<R, E, A>, f: (e: E) => unknown): Managed<R, never, A> {
   return new Managed(T.orDieWith_(ma.task, f));
}

export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: Managed<R, E, A>) => Managed<R, never, A> {
   return (ma) => orDieWith_(ma, f);
}

export function orDie<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
   return orDieWith_(ma, identity);
}
