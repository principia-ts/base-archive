export interface Semiring<A> {
   readonly add: (x: A) => (y: A) => A;
   readonly mul: (x: A) => (y: A) => A;
   readonly zero: A;
   readonly one: A;
}

export const getFunctionSemiring = <A, B>(S: Semiring<B>): Semiring<(a: A) => B> => ({
   zero: () => S.zero,
   one: () => S.one,
   add: (f) => (g) => (x) => S.add(f(x))(g(x)),
   mul: (f) => (g) => (x) => S.mul(f(x))(g(x))
});
