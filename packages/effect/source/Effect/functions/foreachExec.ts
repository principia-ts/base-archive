import { ExecutionStrategy, Parallel, ParallelN, Sequential } from "../../ExecutionStrategy";
import * as T from "../core";
import { _foreachPar } from "./foreachPar";
import { _foreachParN } from "./foreachParN";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const _foreachExec: {
   <R, E, A, B>(es: Sequential, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<
      R,
      E,
      ReadonlyArray<B>
   >;
   <R, E, A, B>(es: Parallel, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<
      R,
      E,
      ReadonlyArray<B>
   >;
   <R, E, A, B>(es: ParallelN, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<
      R,
      E,
      ReadonlyArray<B>
   >;
   <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>): T.Effect<
      R,
      E,
      ReadonlyArray<B>
   >;
} = <R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => T.Effect<R, E, B>) => {
   switch (es._tag) {
      case "Sequential": {
         return T._foreach(as, f) as any;
      }
      case "Parallel": {
         return _foreachPar(as, f) as any;
      }
      case "ParallelN": {
         return _foreachParN(es.n)(as, f) as any;
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
   _foreachExec(es, as, f) as any;
