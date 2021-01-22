import type { Fiber, SyntheticFiber } from '../core'

import * as O from '@principia/base/Option'

import * as C from '../../Cause'
import * as Ex from '../../Exit'
import { map2Par_ } from '../../IO/combinators/apply-par'
import * as I from '../internal/io'

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export function map2_<E, E1, A, A1, B>(
  fa: Fiber<E, A>,
  fb: Fiber<E1, A1>,
  f: (a: A, b: A1) => B
): SyntheticFiber<E | E1, B> {
  return {
    _tag: 'SyntheticFiber',
    getRef: (ref) => I.map2_(fa.getRef(ref), fb.getRef(ref), (a, b) => ref.join(a, b)),
    inheritRefs: I.bind_(fa.inheritRefs, () => fb.inheritRefs),
    interruptAs: (id) => I.map2_(fa.interruptAs(id), fb.interruptAs(id), (ea, eb) => Ex.map2Cause_(ea, eb, f, C.both)),
    poll: I.map2_(fa.poll, fb.poll, (fa, fb) =>
      O.bind_(fa, (ea) => O.map_(fb, (eb) => Ex.map2Cause_(ea, eb, f, C.both)))
    ),
    await: I.result(map2Par_(I.bind_(fa.await, I.done), I.bind_(fb.await, I.done), f))
  }
}

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export function map2<A, D, B, C>(
  fb: Fiber<D, B>,
  f: (a: A, b: B) => C
): <E>(fa: Fiber<E, A>) => SyntheticFiber<D | E, C> {
  return (fa) => map2_(fa, fb, f)
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export function product_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
  return map2_(fa, fb, (a, b) => [a, b])
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export function product<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, (B | A)[]> {
  return (fa) => product_(fa, fb)
}

export function apl_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
  return map2_(fa, fb, (a, _) => a)
}

export function apl<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<E, A, D, B>(fa: Fiber<E, A>, fb: Fiber<D, B>) {
  return map2_(fa, fb, (_, b) => b)
}

export function apr<D, B>(fb: Fiber<D, B>): <E, A>(fa: Fiber<E, A>) => SyntheticFiber<D | E, B> {
  return (fa) => apr_(fa, fb)
}
