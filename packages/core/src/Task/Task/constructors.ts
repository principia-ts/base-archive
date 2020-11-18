import type { Lazy } from "../../Function";
import * as O from "../../Option";
import type { Exit } from "../Exit";
import * as C from "../Exit/Cause";
import type { FiberId } from "../Fiber/FiberId";
import type { EIO, IO, Task } from "./model";
import {
  AsyncInstruction,
  FailInstruction,
  PartialInstruction,
  SucceedInstruction,
  SuspendInstruction,
  TotalInstruction
} from "./model";

/*
 * -------------------------------------------
 * Task Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * succeed :: a -> Task _ _ a
 * ```
 *
 * Creates a `Task` that has succeeded with a pure value
 *
 * @category Constructors
 * @since 1.0.0
 */
export function succeed<E = never, A = never>(a: A): EIO<E, A> {
  return new SucceedInstruction(a);
}

/**
 * ```haskell
 * async :: Task t => (((t r e a -> ()) -> ()), ?[FiberId]) -> t r e a
 * ```
 *
 * Imports an asynchronous side-effect into a `Task`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function async<R, E, A>(
  register: (resolve: (_: Task<R, E, A>) => void) => void,
  blockingOn: ReadonlyArray<FiberId> = []
): Task<R, E, A> {
  return new AsyncInstruction((cb) => {
    register(cb);
    return O.none();
  }, blockingOn);
}

/**
 * ```haskell
 * asyncOption :: (((Task r e a -> ()) -> Option (Task r e a)), ?[FiberId]) -> Task r e a
 * ```
 *
 * Imports an asynchronous effect into a pure `Task`, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called at most once.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function asyncOption<R, E, A>(
  register: (resolve: (_: Task<R, E, A>) => void) => O.Option<Task<R, E, A>>,
  blockingOn: ReadonlyArray<FiberId> = []
): Task<R, E, A> {
  return new AsyncInstruction(register, blockingOn);
}

/**
 * ```haskell
 * total :: (() -> a) -> Task _ _ a
 * ```
 *
 * Creates a `Task` from the return value of a total function
 *
 * @category Constructors
 * @since 1.0.0
 */
export function total<A>(thunk: () => A): IO<A> {
  return new TotalInstruction(thunk);
}

/**
 * ```haskell
 * partial_ :: (() -> a, (Any -> e)) -> Task _ e a
 * ```
 *
 * Creates a `Task` from the return value of a function that may throw, mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partial_<E, A>(thunk: () => A, onThrow: (error: unknown) => E): EIO<E, A> {
  return new PartialInstruction(thunk, onThrow);
}

/**
 * ```haskell
 * partial :: (Any -> e) -> (() -> a) -> Task _ e a
 * ```
 *
 * Creates a `Task` from the return value of a function that may throw, mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partial<E>(onThrow: (error: unknown) => E): <A>(thunk: () => A) => EIO<E, A> {
  return (thunk) => partial_(thunk, onThrow);
}

/**
 * ```haskell
 * suspend :: (() -> Task r e a) -> Task r e a
 * ```
 *
 * Creates a lazily-constructed `Task`, whose construction itself may require effects
 *
 * @category Constructors
 * @since 1.0.0
 */
export function suspend<R, E, A>(factory: Lazy<Task<R, E, A>>): Task<R, E, A> {
  return new SuspendInstruction(factory);
}

/**
 * ```haskell
 * halt :: Cause e -> Task _ e _
 * ```
 *
 * Creates a `Task` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function halt<E>(cause: C.Cause<E>): EIO<E, never> {
  return new FailInstruction(cause);
}

/**
 * ```haskell
 * fail :: e -> Task _ e _
 * ```
 *
 * Creates a `Task` that has failed with value `e`. The moral equivalent of `throw`, except not immoral :)
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fail<E>(e: E): EIO<E, never> {
  return halt(C.fail(e));
}

/**
 * ```haskell
 * die :: Any -> Task _ _ _
 * ```
 *
 * Creates a `Task` that has died with the specified defect
 *
 * @category Constructors
 * @since 1.0.0
 */
export function die(e: unknown): EIO<never, never> {
  return halt(C.die(e));
}

/**
 * ```haskell
 * done :: Exit a b -> Task _ a b
 * ```
 *
 * Creates a `Task` from an exit value
 *
 * @category Constructors
 * @since 1.0.0
 */
export function done<E, A>(exit: Exit<E, A>): EIO<E, A> {
  return suspend(() => {
    switch (exit._tag) {
      case "Success": {
        return succeed(exit.value);
      }
      case "Failure": {
        return halt(exit.cause);
      }
    }
  });
}
