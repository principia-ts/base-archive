import type { Predicate, Refinement } from '../Function'
import type { Option } from '../Option'

export type { Option }

/**
 * @internal
 */
export function Some<A>(a: A): Option<A> {
  return {
    _tag: 'Some',
    value: a
  }
}

/**
 * @internal
 */
export function None<A = never>(): Option<A> {
  return {
    _tag: 'None'
  }
}

/**
 * Constructs a new `Option` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 * @internal
 */
export function fromPredicate_<A, B extends A>(a: A, refinement: Refinement<A, B>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A> {
  return predicate(a) ? None() : Some(a)
}

/**
 * Returns a smart constructor based on the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 * @internal
 */
export function fromPredicate<A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A> {
  return (a) => fromPredicate_(a, predicate)
}

/**
 * @internal
 */
export function getOrElse_<A, B>(fa: Option<A>, onNone: () => B): A | B {
  return fa._tag === 'Some' ? fa.value : onNone()
}

/**
 * @internal
 */
export function getOrElse<B>(onNone: () => B): <A>(fa: Option<A>) => A | B {
  return (fa) => getOrElse_(fa, onNone)
}
