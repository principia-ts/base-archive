import * as C from "./Cause";
import type { Exit, Failure, Success } from "./model";

/*
 * -------------------------------------------
 * Exit Guards
 * -------------------------------------------
 */

export function isSuccess<E, A>(exit: Exit<E, A>): exit is Success<A> {
   return exit._tag === "Success";
}

export function isFailure<E, A>(exit: Exit<E, A>): exit is Failure<E> {
   return exit._tag === "Failure";
}

export function isInterrupt<E, A>(exit: Exit<E, A>): exit is Failure<E> {
   return isFailure(exit) ? C.isInterrupt(exit.cause) : false;
}
