import type { ExecutionStrategy, Parallel, ParallelN, Sequential } from "../../ExecutionStrategy";
import type { Managed } from "../model";
import { foreach_ } from "./foreach";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachExec_: {
   <R, E, A, B>(es: Sequential, as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: Parallel, as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: ParallelN, as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, ReadonlyArray<B>>;
   <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, ReadonlyArray<B>>;
} = <R, E, A, B>(
   es: ExecutionStrategy,
   as: Iterable<A>,
   f: (a: A) => Managed<R, E, B>
): Managed<R, E, ReadonlyArray<B>> => {
   switch (es._tag) {
      case "Sequential": {
         return foreach_(as, f);
      }
      case "Parallel": {
         return foreachPar_(as, f);
      }
      case "ParallelN": {
         return foreachParN_(es.n)(as, f);
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
      f: (a: A) => Managed<R, E, B>
   ) => (as: Iterable<A>) => Managed<R, E, ReadonlyArray<B>>;
   (es: Parallel): <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) => Managed<R, E, ReadonlyArray<B>>;
   (es: ParallelN): <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) => Managed<R, E, ReadonlyArray<B>>;
   (es: ExecutionStrategy): <R, E, A, B>(
      f: (a: A) => Managed<R, E, A>
   ) => (as: Iterable<A>) => Managed<R, E, ReadonlyArray<B>>;
} = (es: ExecutionStrategy) => <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) =>
   foreachExec_(es, as, f) as any;
