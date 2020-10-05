import { Commutative } from "../Commutative";
import { Semigroup } from "../Semigroup";

/**
 * Provides a function that is both associative and commutative that lets you combine any two values into one
 *
 * concat :: a -> a -> a
 * concat(a)(b) == concat(b)(a)
 * concat(concat(a)(b))(c) == concat(a)(concat(b)(c))
 */
export interface AbelianSemigroup<A> extends Semigroup<A>, Commutative {}
