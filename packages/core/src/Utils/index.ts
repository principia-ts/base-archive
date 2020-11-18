export type Literal = string | number | boolean | null;

const typeOf = (x: unknown): string => (x === null ? "null" : typeof x);

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

export const memoize = <A, B>(f: (a: A) => B): ((a: A) => B) => {
  const cache = new Map();
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a);
      cache.set(a, b);
      return b;
    }
    return cache.get(a);
  };
};

export * from "./infer";
export * from "./types";
export * from "./guards";
export * from "./matchers";
