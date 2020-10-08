import type { ExecutionStrategy, Parallel, ParallelN, Sequential } from "../../ExecutionStrategy";
import * as T from "../core";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachExec_: {
   <R, E, A, B>(es: Sequential, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: Parallel, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: ParallelN, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<
      R,
      E,
      ReadonlyArray<B>
   >;
} = <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>) => {
   switch (es._tag) {
      case "Sequential": {
         return T.foreach_(as, f) as any;
      }
      case "Parallel": {
         return foreachPar_(as, f) as any;
      }
      case "ParallelN": {
         return foreachParN_(es.n)(as, f) as any;
      }
   }
};

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachExec: {
   (es: Sequential): <R, E, A, B>(
      f: (a: A) => T.Effect<R, E, B>
   ) => (as: Iterable<A>) => T.Effect<R, E, ReadonlyArray<B>>;
   (es: Parallel): <R, E, A, B>(
      f: (a: A) => T.Effect<R, E, B>
   ) => (as: Iterable<A>) => T.Effect<R, E, ReadonlyArray<B>>;
   (es: ParallelN): <R, E, A, B>(
      f: (a: A) => T.Effect<R, E, B>
   ) => (as: Iterable<A>) => T.Effect<R, E, ReadonlyArray<B>>;
   (es: ExecutionStrategy): <R, E, A, B>(
      f: (a: A) => T.Effect<R, E, A>
   ) => (as: Iterable<A>) => T.Effect<R, E, ReadonlyArray<B>>;
} = (es: ExecutionStrategy) => <R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) => (as: Iterable<A>) =>
   foreachExec_(es, as, f) as any;
