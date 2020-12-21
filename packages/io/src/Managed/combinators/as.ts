import type { Managed } from "../core";

import * as O from "@principia/base/data/Option";

import { map, map_, mapError_ } from "../core";

export function as_<R, E, A, B>(ma: Managed<R, E, A>, b: B): Managed<R, E, B> {
  return map_(ma, () => b);
}

export function as<B>(b: B): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, B> {
  return (ma) => as_(ma, b);
}

export function asSome<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, O.Option<A>> {
  return map_(ma, O.some);
}

export function asSomeError<R, E, A>(ma: Managed<R, E, A>): Managed<R, O.Option<E>, A> {
  return mapError_(ma, O.some);
}

export const asUnit: <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> = map(() => undefined);
