import { identity } from "@principia/base/data/Function";

import * as I from "../_internal/io";
import { Managed } from "../core";

export function orDieWith_<R, E, A>(
  ma: Managed<R, E, A>,
  f: (e: E) => unknown
): Managed<R, never, A> {
  return new Managed(I.orDieWith_(ma.io, f));
}

export function orDieWith<E>(
  f: (e: E) => unknown
): <R, A>(ma: Managed<R, E, A>) => Managed<R, never, A> {
  return (ma) => orDieWith_(ma, f);
}

export function orDie<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  return orDieWith_(ma, identity);
}
