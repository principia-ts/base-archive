/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * empty :: <a>() -> Array a
 *
 * A function that returns a type-safe empty Array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const empty = <A>(): ReadonlyArray<A> => [];

/**
 * fromArray :: MutableArray a -> Array a
 * Constructs a new readonly array from a standard array.
 * (literally a shallow clone)
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromArray<A>(as: Array<A>): ReadonlyArray<A> {
   return Array.from(as);
}

export const makeBy = <A>(n: number, f: (i: number) => A): ReadonlyArray<A> => {
   const r: Array<A> = [];
   for (let i = 0; i < n; i++) {
      r.push(f(i));
   }
   return r;
};

export const range = (start: number, end: number): ReadonlyArray<number> => makeBy(end - start + 1, (i) => start + i);

export const replicate = <A>(n: number, a: A): ReadonlyArray<A> => {
   throw new Error("Test");
};
