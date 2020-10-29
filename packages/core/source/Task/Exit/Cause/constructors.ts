import type { FiberId } from "../../Fiber/FiberId";
import { isEmpty } from "./guards";
import type { Cause } from "./model";

/**
 * ```haskell
 * fail :: e -> Cause e
 * ```
 */
export const fail = <E>(value: E): Cause<E> => ({
   _tag: "Fail",
   value
});

/**
 * ```haskell
 * die :: _ -> Cause Never
 * ```
 */
export const die = (value: unknown): Cause<never> => ({
   _tag: "Die",
   value
});

/**
 * ```haskell
 * interrupt :: FiberId -> Cause Never
 * ```
 */
export const interrupt = (fiberId: FiberId): Cause<never> => ({
   _tag: "Interrupt",
   fiberId
});

/**
 * ```haskell
 * then :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export const then = <E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> =>
   isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Then", left, right };

/**
 * ```haskell
 * both :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export const both = <E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> =>
   isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Both", left, right };
