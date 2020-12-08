import { accessCallTrace, traceAsFrom, traceFrom } from "@principia/compile/tracing-utils";

import type { Lazy } from "../Function";
import * as O from "../Option";
import * as C from "./Cause";
import type { Exit } from "./Exit";
import type { FiberId } from "./Fiber/FiberId";
import type { Trace } from "./Fiber/tracing";
import type { FIO, IO, UIO } from "./model";
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
 * IO Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * succeed :: a -> IO _ _ a
 * ```
 *
 * Creates a `IO` that has succeeded with a pure value
 *
 * @category Constructors
 * @since 1.0.0
 */
export function succeed<E = never, A = never>(a: A): FIO<E, A> {
  return new SucceedInstruction(a, accessCallTrace("succeed"));
}

/**
 * ```haskell
 * async :: IO t => (((t r e a -> ()) -> ()), ?[FiberId]) -> t r e a
 * ```
 *
 * Imports an asynchronous side-effect into a `IO`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function async<R, E, A>(
  register: (resolve: (_: IO<R, E, A>) => void) => void,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return new AsyncInstruction((cb) => {
    register(cb);
    return O.none();
  }, blockingOn);
}

/**
 * ```haskell
 * asyncOption :: (((IO r e a -> ()) -> Option (IO r e a)), ?[FiberId]) -> IO r e a
 * ```
 *
 * Imports an asynchronous effect into a pure `IO`, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called at most once.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function asyncOption<R, E, A>(
  register: (resolve: (_: IO<R, E, A>) => void) => O.Option<IO<R, E, A>>,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return new AsyncInstruction(register, blockingOn);
}

/**
 * ```haskell
 * total :: (() -> a) -> IO _ _ a
 * ```
 *
 * Creates a `IO` from the return value of a total function
 *
 * @category Constructors
 * @since 1.0.0
 */
export function total<A>(thunk: () => A): UIO<A> {
  return new TotalInstruction(thunk);
}

/**
 * ```haskell
 * partial_ :: (() -> a, (Any -> e)) -> IO _ e a
 * ```
 *
 * Creates a `IO` from the return value of a function that may throw, mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partial_<E, A>(thunk: () => A, onThrow: (error: unknown) => E): FIO<E, A> {
  return new PartialInstruction(thunk, onThrow);
}

/**
 * ```haskell
 * partial :: (Any -> e) -> (() -> a) -> IO _ e a
 * ```
 *
 * Creates a `IO` from the return value of a function that may throw, mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partial<E>(onThrow: (error: unknown) => E): <A>(thunk: () => A) => FIO<E, A> {
  return (thunk) => partial_(thunk, onThrow);
}

/**
 * ```haskell
 * suspend :: (() -> IO r e a) -> IO r e a
 * ```
 *
 * Creates a lazily-constructed `IO`, whose construction itself may require effects
 *
 * @category Constructors
 * @since 1.0.0
 */
export function suspend<R, E, A>(factory: Lazy<IO<R, E, A>>): IO<R, E, A> {
  return new SuspendInstruction(factory);
}

/**
 * ```haskell
 * halt :: Cause e -> IO _ e _
 * ```
 *
 * Creates a `IO` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @tracecall halt
 */
export function halt<E>(cause: C.Cause<E>): FIO<E, never> {
  return new FailInstruction(traceFrom("halt", () => cause));
}

export function haltWith<E>(cause: (_: () => Trace) => C.Cause<E>): FIO<E, never> {
  return new FailInstruction(cause);
}

/**
 * ```haskell
 * fail :: e -> IO _ e _
 * ```
 *
 * Creates a `IO` that has failed with value `e`. The moral equivalent of `throw`, except not immoral :)
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fail<E>(e: E): FIO<E, never> {
  return haltWith(traceAsFrom("fail", fail, (trace) => C.traced(C.fail(e), trace())));
}

/**
 * ```haskell
 * die :: Any -> IO _ _ _
 * ```
 *
 * Creates a `IO` that has died with the specified defect
 *
 * @category Constructors
 * @since 1.0.0
 */
export function die(e: unknown): FIO<never, never> {
  return haltWith(traceFrom("die", (trace) => C.traced(C.die(e), trace())));
}

/**
 * ```haskell
 * done :: Exit a b -> IO _ a b
 * ```
 *
 * Creates a `IO` from an exit value
 *
 * @category Constructors
 * @since 1.0.0
 */
export function done<E, A>(exit: Exit<E, A>): FIO<E, A> {
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
