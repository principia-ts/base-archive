import { pure } from "../core";
import type { Effect } from "../Effect";
import { tryOrElse_ } from "./tryOrElse";

export const orElse_ = <R, E, A, R1, E1, A1>(
   ma: Effect<R, E, A>,
   that: () => Effect<R1, E1, A1>
): Effect<R & R1, E1, A | A1> => tryOrElse_(ma, that, pure);

export const orElse = <R1, E1, A1>(that: () => Effect<R1, E1, A1>) => <R, E, A>(
   ma: Effect<R, E, A>
): Effect<R & R1, E1, A | A1> => tryOrElse_(ma, that, pure);
