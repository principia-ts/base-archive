import type { Fiber, SyntheticFiber } from '../core'

import * as Ex from '../../Exit'
import * as O from '../../Option'
import * as I from '../internal/io'

/**
 * Effectfully maps over the value the fiber computes.
 */
export function mapM_<E, E1, A, B>(fiber: Fiber<E, A>, f: (a: A) => I.FIO<E1, B>): Fiber<E | E1, B> {
  return {
    _tag: 'SyntheticFiber',
    await: I.bind_(fiber.await, Ex.foreachM(f)),
    getRef: (ref) => fiber.getRef(ref),
    inheritRefs: fiber.inheritRefs,
    interruptAs: (id) => I.bind_(fiber.interruptAs(id), Ex.foreachM(f)),
    poll: I.bind_(
      fiber.poll,
      O.match(
        () => I.pure(O.none()),
        (a) => I.map_(Ex.foreachM_(a, f), O.some)
      )
    )
  }
}

/**
 * Effectfully maps over the value the fiber computes.
 */
export function mapM<A, E1, B>(f: (a: A) => I.FIO<E1, B>): <E>(fiber: Fiber<E, A>) => Fiber<E1 | E, B> {
  return (fiber) => mapM_(fiber, f)
}

/**
 * Maps over the value the fiber computes.
 */
export function map_<E, A, B>(fa: Fiber<E, A>, f: (a: A) => B): Fiber<E, B> {
  return mapM_(fa, (a) => I.pure(f(a)))
}

/**
 * Maps over the value the fiber computes.
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Fiber<E, A>) => Fiber<E, B> {
  return (fa) => map_(fa, f)
}
