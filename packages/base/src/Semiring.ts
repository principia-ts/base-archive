export interface Semiring<A> {
  readonly add_: (x: A, y: A) => A
  readonly add: (y: A) => (x: A) => A
  readonly mul_: (x: A, y: A) => A
  readonly mul: (y: A) => (x: A) => A
  readonly zero: A
  readonly one: A
}

export const getFunctionSemiring = <A, B>(S: Semiring<B>): Semiring<(a: A) => B> => ({
  zero: () => S.zero,
  one: () => S.one,
  add: (f) => (g) => (x) => S.add_(f(x), g(x)),
  mul: (f) => (g) => (x) => S.mul_(f(x), g(x)),
  add_: (f, g) => (x) => S.add_(f(x), g(x)),
  mul_: (f, g) => (x) => S.mul_(f(x), g(x))
})
