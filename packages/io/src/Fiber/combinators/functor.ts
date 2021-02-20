import type { Fiber, SyntheticFiber } from '../core'

import * as O from '@principia/base/Option'

import * as Ex from '../../Exit'
import * as I from '../internal/io'

/**
 * Effectfully maps over the value the fiber computes.
 */
export function mapM_<E, E1, A, B>(fiber: Fiber<E, A>, f: (a: A) => I.FIO<E1, B>): SyntheticFiber<E | E1, B> {
  return {
    _tag: 'SyntheticFiber',
    await: I.bind_(fiber.await, Ex.foreachEffect(f)),
    getRef: (ref) => fiber.getRef(ref),
    inheritRefs: fiber.inheritRefs,
    interruptAs: (id) => I.bind_(fiber.interruptAs(id), Ex.foreachEffect(f)),
    poll: I.bind_(
      fiber.poll,
      O.match(
        () => I.pure(O.None()),
        (a) => I.map_(Ex.foreachEffect_(a, f), O.Some)
      )
    )
  }
}

/**
 * Effectfully maps over the value the fiber computes.
 */
export function mapM<A, E1, B>(f: (a: A) => I.FIO<E1, B>): <E>(fiber: Fiber<E, A>) => SyntheticFiber<E1 | E, B> {
  return (fiber) => mapM_(fiber, f)
}

/**
 * Maps over the value the fiber computes.
 */
export function map_<E, A, B>(fa: Fiber<E, A>, f: (a: A) => B) {
  return mapM_(fa, (a) => I.pure(f(a)))
}

/**
 * Maps over the value the fiber computes.
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Fiber<E, A>) => SyntheticFiber<E, B> {
  return (fa) => map_(fa, f)
}
