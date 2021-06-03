export interface Left<E> {
  readonly _tag: 'Left'
  readonly left: E
}

export interface Right<A> {
  readonly _tag: 'Right'
  readonly right: A
}

export type Either<E, A> = Left<E> | Right<A>

/**
 * @internal
 */
export function left<E, A = never>(e: E): Either<E, A> {
  return {
    _tag: 'Left',
    left: e
  }
}

/**
 * @internal
 */
export function right<E = never, A = never>(a: A): Either<E, A> {
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
