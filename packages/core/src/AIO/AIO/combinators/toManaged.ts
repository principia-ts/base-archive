import { fromEffect, makeExit_ } from "../../Managed/_core";
import type { Managed } from "../../Managed/model";
import type { AIO } from "../model";

export function toManaged_<R, E, A>(ma: AIO<R, E, A>): Managed<R, E, A>;
export function toManaged_<R, E, A, R1>(
  ma: AIO<R, E, A>,
  release: (a: A) => AIO<R1, never, any>
): Managed<R & R1, E, A>;
export function toManaged_<R, E, A, R1 = unknown>(
  ma: AIO<R, E, A>,
  release?: (a: A) => AIO<R1, never, any>
): Managed<R & R1, E, A> {
  return release ? makeExit_(ma, release) : fromEffect(ma);
}

export function toManaged(): <R, E, A>(ma: AIO<R, E, A>) => Managed<R, E, A>;
export function toManaged<A, R>(
  release: (a: A) => AIO<R, never, any>
): <R1, E1>(ma: AIO<R1, E1, A>) => Managed<R & R1, E1, A>;
export function toManaged<A, R>(
  release?: (a: A) => AIO<R, never, any>
): <R1, E1>(ma: AIO<R1, E1, A>) => Managed<R & R1, E1, A> {
  return (ma) => (release ? makeExit_(ma, release) : fromEffect(ma));
}
