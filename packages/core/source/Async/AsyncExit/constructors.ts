import type { AsyncExit, Rejection } from "./model";

/*
 * -------------------------------------------
 * AsyncExit Constructors
 * -------------------------------------------
 */

export const failure = <E = never>(e: E): Rejection<E> => ({
   _tag: "Failure",
   error: e
});

export const success = <E = never, A = never>(a: A): AsyncExit<E, A> => ({
   _tag: "Success",
   value: a
});

export const interrupted = <E = never>(): Rejection<E> => ({
   _tag: "Interrupt"
});
