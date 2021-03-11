import type { Either } from '../Either'

export type { Either }

/**
 * @internal
 */
export function Left<E, A = never>(e: E): Either<E, A> {
  return {
    _tag: 'Left',
    left: e
  }
}

/**
 * @internal
 */
export function Right<E = never, A = never>(a: A): Either<E, A> {
  return {
    _tag: 'Right',
    right: a
  }
}

/**
 * @internal
 */
export function match_<E, A, B, C>(fa: Either<E, A>, onLeft: (e: E) => B, onRight: (a: A) => C): B | C {
  switch (fa._tag) {
    case 'Left':
      return onLeft(fa.left)
    case 'Right':
      return onRight(fa.right)
  }
}

/**
 * @internal
 */
export function match<E, A, B, C>(onLeft: (e: E) => B, onRight: (a: A) => C): (fa: Either<E, A>) => B | C {
  return (fa) => match_(fa, onLeft, onRight)
}
