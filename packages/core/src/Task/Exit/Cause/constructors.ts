import type { FiberId } from "../../Fiber/FiberId";
import { isEmpty } from "./guards";
import type { Cause } from "./model";

/**
 * ```haskell
 * fail :: e -> Cause e
 * ```
 */
export function fail<E>(value: E): Cause<E> {
   return {
      _tag: "Fail",
      value
   };
}

/**
 * ```haskell
 * die :: _ -> Cause Never
 * ```
 */
export function die(value: unknown): Cause<never> {
   return {
      _tag: "Die",
      value
   };
}

/**
 * ```haskell
 * interrupt :: FiberId -> Cause Never
 * ```
 */
export function interrupt(fiberId: FiberId): Cause<never> {
   return {
      _tag: "Interrupt",
      fiberId
   };
}

/**
 * ```haskell
 * then :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export function then<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
   return isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Then", left, right };
}

/**
 * ```haskell
 * both :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export function both<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
   return isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Both", left, right };
}
