import type { Managed } from "../../Managed/core";
import type { IO } from "../core";

import { fromEffect, makeExit_ } from "../../Managed/core";

export function toManaged_<R, E, A>(ma: IO<R, E, A>): Managed<R, E, A>;
export function toManaged_<R, E, A, R1>(
  ma: IO<R, E, A>,
  release: (a: A) => IO<R1, never, any>
): Managed<R & R1, E, A>;
export function toManaged_<R, E, A, R1 = unknown>(
  ma: IO<R, E, A>,
  release?: (a: A) => IO<R1, never, any>
): Managed<R & R1, E, A> {
  return release ? makeExit_(ma, release) : fromEffect(ma);
}

export function toManaged(): <R, E, A>(ma: IO<R, E, A>) => Managed<R, E, A>;
export function toManaged<A, R>(
  release: (a: A) => IO<R, never, any>
): <R1, E1>(ma: IO<R1, E1, A>) => Managed<R & R1, E1, A>;
export function toManaged<A, R>(
  release?: (a: A) => IO<R, never, any>
): <R1, E1>(ma: IO<R1, E1, A>) => Managed<R & R1, E1, A> {
  return (ma) => (release ? makeExit_(ma, release) : fromEffect(ma));
}
