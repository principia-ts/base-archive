import type { Predicate } from '../Predicate'
import type { Refinement } from '../Refinement'

import { $equals, equals } from '../Structural/Equatable'
import { $hash, combineHash, hash, hashString } from '../Structural/Hashable'
import { isObject } from '../util/predicates'

export const OptionTypeId = Symbol('@principia/base/Option')
export type OptionTypeId = typeof OptionTypeId

const _noneHash = hashString('@principia/base/Option/None')

const _someHash = hashString('@principia/base/Option/Some')

export class None {
  readonly [OptionTypeId]: OptionTypeId = OptionTypeId
  readonly _tag                         = 'None'
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}
  [$equals](that: unknown): boolean {
    return isNone(that)
  }
  get [$hash]() {
    return _noneHash
  }
}

export class Some<A> {
  readonly [OptionTypeId]: OptionTypeId = OptionTypeId
  readonly _tag                         = 'Some'
  constructor(readonly value: A) {}
  [$equals](that: unknown): boolean {
    return isSome(that) && equals(this.value, that.value)
  }
  get [$hash]() {
    return combineHash(_someHash, hash(this.value))
  }
}

export type Option<A> = None | Some<A>

function isOption(u: unknown): u is Option<unknown> {
  return isObject(u) && OptionTypeId in u
}

function isNone(u: unknown): u is None {
  return isOption(u) && u._tag === 'None'
}

function isSome(u: unknown): u is Some<unknown> {
  return isOption(u) && u._tag === 'Some'
}

/**
 * @internal
 */
export function some<A>(a: A): Option<A> {
  return new Some(a)
}

/**
 * @internal
 */
export function none<A = never>(): Option<A> {
  return new None()
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
  return predicate(a) ? none() : some(a)
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

export function fromNullable<A>(a: A | null | undefined): Option<NonNullable<A>> {
  return a == null ? none() : some(a as NonNullable<A>)
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
