const _I = '_I'
type _I = typeof _I

export abstract class Ior<E, A> {
  readonly _URI!: 'Ior'
  readonly _E!: () => E
  readonly _A!: () => A
  get [_I]() {
    return this as any
  }
}

class Left<E> extends Ior<E, never> {
  readonly _tag = 'Left'
  constructor(readonly left: E) {
    super()
  }
}

class Right<A> extends Ior<never, A> {
  readonly _tag = 'Right'
  constructor(readonly right: A) {
    super()
  }
}

class Both<E, A> extends Ior<E, A> {
  readonly _tag = 'Both'
  constructor(readonly left: E, readonly right: A) {
    super()
  }
}

class Lazy<A> extends Ior<never, A> {
  readonly _tag = 'Lazy'
  constructor(readonly thunk: () => A) {
    super()
  }
}

class TryCatch<E, A> extends Ior<E, A> {
  readonly _tag = 'TryCatch'
  constructor(readonly thunk: () => A, readonly mapError: (u: unknown) => E) {
    super()
  }
}

class Match<E, A, E1, B, E2, C, E3, D> {
  readonly _tag = 'Match'
  constructor(
    readonly ior: Ior<E, A>,
    readonly onLeft: (e: E) => Ior<E1, B>,
    readonly onRight: (a: A) => Ior<E2, C>,
    readonly onBoth: (e: E, a: A) => Ior<E3, D>
  ) {}
}
