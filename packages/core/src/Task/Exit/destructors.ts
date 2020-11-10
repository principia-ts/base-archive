import type { Task } from "../Task/model";
import type * as C from "./Cause";
import type { Exit } from "./model";

export const fold_ = <E, A, B>(exit: Exit<E, A>, onFailure: (e: C.Cause<E>) => B, onSuccess: (a: A) => B): B => {
   switch (exit._tag) {
      case "Success": {
         return onSuccess(exit.value);
      }
      case "Failure": {
         return onFailure(exit.cause);
      }
   }
};

export const fold = <E, A, B>(onFailure: (e: C.Cause<E>) => B, onSuccess: (a: A) => B) => (exit: Exit<E, A>): B =>
   fold_(exit, onFailure, onSuccess);

/**
 * Folds over the value or cause.
 */
export const foldM_ = <E, A, R1, E1, A1, R2, E2, A2>(
   exit: Exit<E, A>,
   onFailure: (e: C.Cause<E>) => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
): Task<R1 & R2, E1 | E2, A1 | A2> => {
   switch (exit._tag) {
      case "Success": {
         return onSuccess(exit.value);
      }
      case "Failure": {
         return onFailure(exit.cause);
      }
   }
};

export const foldM = <E, A, R1, E1, A1, R2, E2, A2>(
   onFailure: (e: C.Cause<E>) => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
) => (exit: Exit<E, A>) => foldM_(exit, onFailure, onSuccess);
