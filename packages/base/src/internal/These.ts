export interface Both<E, A> {
  readonly _tag: 'Both'
  readonly left: E
  readonly right: A
}

export interface Left<E> {
  readonly _tag: 'Left'
  readonly left: E
}

export interface Right<A> {
  readonly _tag: 'Right'
  readonly right: A
}

export type These<E, A> = Left<E> | Right<A> | Both<E, A>

export function Left<E, A = never>(e: E): These<E, A> {
  return {
    _tag: 'Left',
    left: e
  }
}

export function Right<E = never, A = never>(a: A): These<E, A> {
  return {
    _tag: 'Right',
    right: a
  }
}

export function Both<E, A>(e: E, a: A): These<E, A> {
  return {
    _tag: 'Both',
    left: e,
    right: a
  }
}

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

export function match<E, A, B, C, D>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): (fa: These<E, A>) => B | C | D {
  return (fa) => match_(fa, onLeft, onRight, onBoth)
}
