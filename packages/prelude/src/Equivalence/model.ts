/**
 * An `Equivalence<A, B>` defines an equivalence between two types `A` and `B`.
 * These types represent different ways to store the same information.
 *
 * Equivalences are symmetrical. So if `A` is equivalent to `B`, then `B` is
 * equivalent to `A`.
 */
export interface Equivalence<A, B> {
  readonly to: (a: A) => B;
  readonly from: (b: B) => A;
}
