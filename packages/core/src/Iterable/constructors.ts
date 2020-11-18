export function* genOf<A>(a: A) {
  yield a;
}

export const never: Iterable<never> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *[Symbol.iterator]() {}
};
