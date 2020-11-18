import { flow } from "@principia/prelude";

import * as O from "../../../Option";
import { fail, succeed } from "../constructors";
import type { Managed } from "../model";
import { chain_ } from "../monad";

export function collectM_<R, E, A, E1, R2, E2, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): Managed<R & R2, E | E1 | E2, B> {
  return chain_(ma, (a) => O.getOrElse_(pf(a), () => fail<E1 | E2>(e)));
}

export function collectM<A, E1, R2, E2, B>(
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R2, E1 | E | E2, B> {
  return (ma) => collectM_(ma, e, pf);
}

export function collect_<R, E, A, E1, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<B>
): Managed<R, E | E1, B> {
  return collectM_(ma, e, flow(pf, O.map(succeed)));
}

export function collect<A, E1, B>(
  e: E1,
  pf: (a: A) => O.Option<B>
): <R, E>(ma: Managed<R, E, A>) => Managed<R, E1 | E, B> {
  return (ma) => collect_(ma, e, pf);
}
