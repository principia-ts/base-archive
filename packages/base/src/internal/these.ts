import type { These } from '../These'

/**
 * @internal
 */
export function Left<E, A = never>(e: E): These<E, A> {
  return {
    _tag: 'Left',
    left: e
  }
}

/**
 * @internal
 */
export function Right<E = never, A = never>(a: A): These<E, A> {
  return {
    _tag: 'Right',
    right: a
  }
}

/**
 * @internal
 */
export function Both<E, A>(e: E, a: A): These<E, A> {
  return {
    _tag: 'Both',
    left: e,
    right: a
  }
}

/**
 * @internal
 */
export function match_<E, A, B, C, D>(
  fa: These<E, A>,
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): B | C | D {
  switch (fa._tag) {
    case 'Left':
      return onLeft(fa.left)
    case 'Right':
      return onRight(fa.right)
    case 'Both':
      return onBoth(fa.left, fa.right)
  }
}

/**
 * @internal
 */
export function match<E, A, B, C, D>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): (fa: These<E, A>) => B | C | D {
  return (fa) => match_(fa, onLeft, onRight, onBoth)
}
