import { pure } from "../core";
import type { Effect } from "../model";
import { orElse_ } from "./orElse";

export const orElseSucceed_ = <R, E, A, A1>(ma: Effect<R, E, A>, a: A1): Effect<R, E, A | A1> =>
   orElse_(ma, () => pure(a));

export const orElseSucceed = <A1>(a: A1) => <R, E, A>(self: Effect<R, E, A>) => orElseSucceed_(self, a);
