import type * as P from '@principia/prelude'

/**
 * Every boolean algebras has a dual algebra, which involves reversing one/zero as well as join/meet.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getDual<A>(B: P.BooleanAlgebra<A>): P.BooleanAlgebra<A> {
  return {
    meet: B.join,
    join: B.meet,
    zero: B.one,
    one: B.zero,
    implies: (x, y) => B.join(B.not(x), y),
    not: B.not
  }
}
