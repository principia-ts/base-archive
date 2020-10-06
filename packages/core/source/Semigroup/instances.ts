import { max, min, Ord } from "../Ord";
import type { ReadonlyRecord } from "../Record";
import { Semigroup } from "./Semigroup";

/**
 * Boolean semigroup under conjunction
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupAll: Semigroup<boolean> = {
   concat: (x) => (y) => x && y
};

/**
 * Boolean semigroup under disjunction
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupAny: Semigroup<boolean> = {
   concat: (x) => (y) => x || y
};

/**
 * Number `Semigroup` under addition
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupSum: Semigroup<number> = {
   concat: (x) => (y) => x + y
};

/**
 * Number `Semigroup` under multiplication
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupProduct: Semigroup<number> = {
   concat: (x) => (y) => x * y
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const semigroupString: Semigroup<string> = {
   concat: (x) => (y) => x + y
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const semigroupVoid: Semigroup<void> = {
   concat: () => () => undefined
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFirstSemigroup = <A = never>(): Semigroup<A> => ({
   concat: (x) => (_) => x
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getLastSemigroup = <A = never>(): Semigroup<A> => ({
   concat: (_) => (y) => y
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getTupleSemigroup = <T extends ReadonlyArray<Semigroup<any>>>(
   ...semigroups: T
): Semigroup<{ [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }> => ({
   concat: (x) => (y) => semigroups.map((s, i) => s.concat(x[i])(y[i])) as any
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getDualSemigroup = <A>(S: Semigroup<A>): Semigroup<A> => ({
   concat: (x) => (y) => S.concat(y)(x)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFunctionSemigroup = <S>(S: Semigroup<S>) => <A = never>(): Semigroup<(a: A) => S> => ({
   concat: (f) => (g) => (a) => S.concat(f(a))(g(a))
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getStructSemigroup = <O extends ReadonlyRecord<string, any>>(
   semigroups: { [K in keyof O]: Semigroup<O[K]> }
): Semigroup<O> => ({
   concat: (x) => (y) => {
      const r: any = {};
      for (const key of Object.keys(semigroups)) {
         r[key] = semigroups[key].concat(x[key])(y[key]);
      }
      return r;
   }
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getMeetSemigroup = <A>(O: Ord<A>): Semigroup<A> => {
   const minO = min(O);
   return {
      concat: (x) => (y) => minO(y)(x)
   };
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getJoinSemigroup = <A>(O: Ord<A>): Semigroup<A> => {
   const maxO = max(O);
   return {
      concat: (x) => (y) => maxO(y)(x)
   };
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getObjectSemigroup = <A extends object = never>(): Semigroup<A> => ({
   concat: (x) => (y) => Object.assign({}, x, y)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getIntercalateSemigroup = <A>(a: A) => (S: Semigroup<A>): Semigroup<A> => ({
   concat: (x) => (y) => S.concat(x)(S.concat(a)(y))
});
