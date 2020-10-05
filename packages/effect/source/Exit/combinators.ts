import * as T from "../Effect/core";
import { failure } from "./core";
import { Exit } from "./Exit";

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export const foreach = <A2, R, E, A>(f: (a: A2) => T.Effect<R, E, A>) => <E2>(exit: Exit<E2, A2>) =>
   _foreach(exit, f);

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export const _foreach = <E2, A2, R, E, A>(
   exit: Exit<E2, A2>,
   f: (a: A2) => T.Effect<R, E, A>
): T.Effect<R, never, Exit<E | E2, A>> => {
   switch (exit._tag) {
      case "Failure": {
         return T.pure(failure(exit.cause));
      }
      case "Success": {
         return T.result(f(exit.value));
      }
   }
};

export const _mapM = <R, E, E1, A, A1>(
   exit: Exit<E, A>,
   f: (a: A) => T.Effect<R, E1, A1>
): T.Effect<R, never, Exit<E | E1, A1>> => {
   switch (exit._tag) {
      case "Failure":
         return T.pure(failure(exit.cause));
      case "Success":
         return T.result(f(exit.value));
   }
};

export const mapM = <R, E1, A, A1>(f: (a: A) => T.Effect<R, E1, A1>) => <E>(
   exit: Exit<E, A>
): T.Effect<R, never, Exit<E | E1, A1>> => _mapM(exit, f);
