/**
 * Provides an associative function that lets you combine any two values into one
 *
 * concat :: a -> a -> a
 * concat(concat(a)(b))(c) == concat(a)(concat(b)(c))
 */
export interface Semigroup<A> {
   readonly concat: (a: A) => (b: A) => A;
}
