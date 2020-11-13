import type { AsyncExit } from "./AsyncExit";
import type { Async } from "./model";
import {
   DoneInstruction,
   FailInstruction,
   PartialInstruction,
   PromiseInstruction,
   SucceedInstruction,
   SuspendInstruction,
   TotalInstruction
} from "./model";

/*
 * -------------------------------------------
 * Async Constructors
 * -------------------------------------------
 */

export function succeed<A>(a: A): Async<unknown, never, A> {
   return new SucceedInstruction(a);
}

export function fail<E>(e: E): Async<unknown, E, never> {
   return new FailInstruction(e);
}

export function done<E, A>(exit: AsyncExit<E, A>): Async<unknown, E, A> {
   return new DoneInstruction(exit);
}

export function suspend<R, E, A>(factory: () => Async<R, E, A>): Async<R, E, A> {
   return new SuspendInstruction(factory);
}

export function unfailable<A>(promise: (onInterrupt: (f: () => void) => void) => Promise<A>): Async<unknown, never, A> {
   return new PromiseInstruction(promise, () => undefined as never);
}

export function promise_<E, A>(
   promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
   onError: (u: unknown) => E
): Async<unknown, E, A> {
   return new PromiseInstruction(promise, onError);
}

export function promise<E>(
   onError: (u: unknown) => E
): <A>(promise: (onInterrupt: (f: () => void) => void) => Promise<A>) => PromiseInstruction<E, A> {
   return (promise) => new PromiseInstruction(promise, onError);
}

export function total<A>(thunk: () => A): Async<unknown, never, A> {
   return new TotalInstruction(thunk);
}

export function partial_<E, A>(thunk: () => A, onThrow: (error: unknown) => E): Async<unknown, E, A> {
   return new PartialInstruction(thunk, onThrow);
}

export function partial<E>(onThrow: (error: unknown) => E): <A>(thunk: () => A) => Async<unknown, E, A> {
   return (thunk) => partial_(thunk, onThrow);
}
