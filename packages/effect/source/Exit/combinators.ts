import type { Effect } from "../Effect";
import * as T from "../Effect/core";
import { failure } from "./core";
import type { Exit } from "./Exit";

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export const foreach_ = <E2, A2, R, E, A>(
   exit: Exit<E2, A2>,
   f: (a: A2) => Effect<R, E, A>
): Effect<R, never, Exit<E | E2, A>> => {
   switch (exit._tag) {
      case "Failure": {
         return T.pure(failure(exit.cause));
      }
      case "Success": {
         return T.result(f(exit.value));
      }
   }
};

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export const foreach = <A2, R, E, A>(f: (a: A2) => Effect<R, E, A>) => <E2>(exit: Exit<E2, A2>) => foreach_(exit, f);

export const mapM_ = <R, E, E1, A, A1>(
   exit: Exit<E, A>,
   f: (a: A) => Effect<R, E1, A1>
): Effect<R, never, Exit<E | E1, A1>> => {
   switch (exit._tag) {
      case "Failure":
         return T.pure(failure(exit.cause));
      case "Success":
         return T.result(f(exit.value));
   }
};

export const mapM = <R, E1, A, A1>(f: (a: A) => Effect<R, E1, A1>) => <E>(
   exit: Exit<E, A>
): Effect<R, never, Exit<E | E1, A1>> => mapM_(exit, f);
