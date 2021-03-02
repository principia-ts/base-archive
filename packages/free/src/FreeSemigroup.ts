import type { Semigroup } from '@principia/base/typeclass'

import { makeSemigroup } from '@principia/base/typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Element<A> {
  readonly _tag: 'Element'
  readonly value: A
}

export interface Combine<A> {
  readonly _tag: 'Combine'
  readonly left: FreeSemigroup<A>
  readonly right: FreeSemigroup<A>
}

export type FreeSemigroup<A> = Element<A> | Combine<A>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function combine<A>(left: FreeSemigroup<A>, right: FreeSemigroup<A>): FreeSemigroup<A> {
  return {
    _tag: 'Combine',
    left,
    right
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function element<A>(a: A): FreeSemigroup<A> {
  return {
    _tag: 'Element',
    value: a
  }
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * @category Destructors
 * @since 1.0.0
 */
export function fold<A, R>(
  onOf: (value: A) => R,
  onConcat: (left: FreeSemigroup<A>, right: FreeSemigroup<A>) => R
): (f: FreeSemigroup<A>) => R {
  return (f) => {
    switch (f._tag) {
      case 'Element':
        return onOf(f.value)
      case 'Combine':
        return onConcat(f.left, f.right)
    }
  }
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<A = never>(): Semigroup<FreeSemigroup<A>> {
  return makeSemigroup(combine)
}
