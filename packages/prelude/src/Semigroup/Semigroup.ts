import type { CombineFn, CombineFn_ } from "./CombineFn";

/**
 * `Semigroup` defines an associative binary operator `combine` on given type `A`.
 * `combine` must fulfill the associativity law, which states that for a binary operation `*` on type `A`:
 *
 * ```
 * (a * b) * c === a * (b * c) for all a, b, c, in A
 * ```
 *
 * `Semigroup` defines both an uncurried function `combine_` and a curried function
 * `combine` with arguments interchanged for `pipeable` application.
 */
export interface Semigroup<A> {
  readonly combine_: CombineFn_<A>;
  readonly combine: CombineFn<A>;
}
