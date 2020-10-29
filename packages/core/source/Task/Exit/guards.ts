import * as C from "./Cause";
import type { Exit, Failure, Success } from "./model";

/*
 * -------------------------------------------
 * Exit Guards
 * -------------------------------------------
 */

export const isSuccess = <E, A>(exit: Exit<E, A>): exit is Success<A> => exit._tag === "Success";

export const isFailure = <E, A>(exit: Exit<E, A>): exit is Failure<E> => exit._tag === "Failure";

export const isInterrupt = <E, A>(exit: Exit<E, A>): exit is Failure<E> =>
   isFailure(exit) ? C.isInterrupt(exit.cause) : false;
