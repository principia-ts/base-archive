import type { Reservation } from "../../Managed";
import { makeReserve, use_ } from "../../Managed";
import type { Effect } from "../model";

export const reserve_ = <R, E, R1, E1, A, R2, E2, B>(
   reservation: Effect<R, E, Reservation<R1, E1, A>>,
   use: (a: A) => Effect<R2, E2, B>
) => use_(makeReserve(reservation), use);

export const reserve = <A, R2, E2, B>(use: (a: A) => Effect<R2, E2, B>) => <R, E, R1, E1>(
   reservation: Effect<R, E, Reservation<R1, E1, A>>
) => reserve_(reservation, use);
