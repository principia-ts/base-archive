import type { Reservation } from "../../Managed";
import { makeReserve, use_ } from "../../Managed";
import type { AIO } from "../model";

export function reserve_<R, E, R1, E1, A, R2, E2, B>(
  reservation: AIO<R, E, Reservation<R1, E1, A>>,
  use: (a: A) => AIO<R2, E2, B>
): AIO<R & R1 & R2, E | E1 | E2, B> {
  return use_(makeReserve(reservation), use);
}

export function reserve<A, R2, E2, B>(
  use: (a: A) => AIO<R2, E2, B>
): <R, E, R1, E1>(
  reservation: AIO<R, E, Reservation<R1, E1, A>>
) => AIO<R & R1 & R2, E | E1 | E2, B> {
  return (reservation) => reserve_(reservation, use);
}
