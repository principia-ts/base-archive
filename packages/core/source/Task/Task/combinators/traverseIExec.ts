import * as T from "../_core";
import type { ExecutionStrategy, Parallel, ParallelN, Sequential } from "../../ExecutionStrategy";
import { traverseIPar_ } from "./traverseIPar";
import { traverseIParN_ } from "./traverseIParN";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const traverseIExec_: {
   <R, E, A, B>(es: Sequential, as: Iterable<A>, f: (a: A) => T.Task<R, E, B>): T.Task<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: Parallel, as: Iterable<A>, f: (a: A) => T.Task<R, E, B>): T.Task<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: ParallelN, as: Iterable<A>, f: (a: A) => T.Task<R, E, B>): T.Task<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => T.Task<R, E, B>): T.Task<R, E, ReadonlyArray<B>>;
} = <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => T.Task<R, E, B>) => {
   switch (es._tag) {
      case "Sequential": {
         return T.traverseI_(as, f) as any;
      }
      case "Parallel": {
         return traverseIPar_(as, f) as any;
      }
      case "ParallelN": {
         return traverseIParN_(es.n)(as, f) as any;
      }
   }
};

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const traverseIExec: {
   (es: Sequential): <R, E, A, B>(f: (a: A) => T.Task<R, E, B>) => (as: Iterable<A>) => T.Task<R, E, ReadonlyArray<B>>;
   (es: Parallel): <R, E, A, B>(f: (a: A) => T.Task<R, E, B>) => (as: Iterable<A>) => T.Task<R, E, ReadonlyArray<B>>;
   (es: ParallelN): <R, E, A, B>(f: (a: A) => T.Task<R, E, B>) => (as: Iterable<A>) => T.Task<R, E, ReadonlyArray<B>>;
   (es: ExecutionStrategy): <R, E, A, B>(
      f: (a: A) => T.Task<R, E, A>
   ) => (as: Iterable<A>) => T.Task<R, E, ReadonlyArray<B>>;
} = (es: ExecutionStrategy) => <R, E, A, B>(f: (a: A) => T.Task<R, E, B>) => (as: Iterable<A>) =>
   traverseIExec_(es, as, f) as any;
