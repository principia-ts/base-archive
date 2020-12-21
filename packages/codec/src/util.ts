/**
 * @internal
 */
export const typeOf = (x: unknown): string => (x === null ? "null" : typeof x);

/**
 * @internal
 */
export const _intersect = <A, B>(a: A, b: B): A & B => {
  if (a !== undefined && b !== undefined) {
    const tx = typeOf(a);
    const ty = typeOf(b);
    if (tx === "object" || ty === "object") {
      return Object.assign({}, a, b);
    }
  }
  return b as any;
};
