import { pure } from "../core";
import type { Task } from "../model";
import { tryOrElse_ } from "./tryOrElse";

export const orElse_ = <R, E, A, R1, E1, A1>(
   ma: Task<R, E, A>,
   that: () => Task<R1, E1, A1>
): Task<R & R1, E1, A | A1> => tryOrElse_(ma, that, pure);

export const orElse = <R1, E1, A1>(that: () => Task<R1, E1, A1>) => <R, E, A>(
   ma: Task<R, E, A>
): Task<R & R1, E1, A | A1> => tryOrElse_(ma, that, pure);
