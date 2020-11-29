import type { Lazy } from "../../Function";
import * as O from "../../Option";
import type { Exit } from "../Exit";
import * as C from "../Exit/Cause";
import type { FiberId } from "../Fiber/FiberId";
import type { AIO, EIO, IO } from "./model";
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
 * AIO Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * succeed :: a -> AIO _ _ a
 * ```
 *
 * Creates a `AIO` that has succeeded with a pure value
 *
 * @category Constructors
 * @since 1.0.0
 */
export function succeed<E = never, A = never>(a: A): EIO<E, A> {
  return new SucceedInstruction(a);
}

/**
 * ```haskell
 * async :: AIO t => (((t r e a -> ()) -> ()), ?[FiberId]) -> t r e a
 * ```
 *
 * Imports an asynchronous side-effect into a `AIO`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function async<R, E, A>(
  register: (resolve: (_: AIO<R, E, A>) => void) => void,
  blockingOn: ReadonlyArray<FiberId> = []
): AIO<R, E, A> {
  return new AsyncInstruction((cb) => {
    register(cb);
    return O.none();
  }, blockingOn);
}

/**
 * ```haskell
 * asyncOption :: (((AIO r e a -> ()) -> Option (AIO r e a)), ?[FiberId]) -> AIO r e a
 * ```
 *
 * Imports an asynchronous effect into a pure `AIO`, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called at most once.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function asyncOption<R, E, A>(
  register: (resolve: (_: AIO<R, E, A>) => void) => O.Option<AIO<R, E, A>>,
  blockingOn: ReadonlyArray<FiberId> = []
): AIO<R, E, A> {
  return new AsyncInstruction(register, blockingOn);
}

/**
 * ```haskell
 * total :: (() -> a) -> AIO _ _ a
 * ```
 *
 * Creates a `AIO` from the return value of a total function
 *
 * @category Constructors
 * @since 1.0.0
 */
export function total<A>(thunk: () => A): IO<A> {
  return new TotalInstruction(thunk);
}

/**
 * ```haskell
 * partial_ :: (() -> a, (Any -> e)) -> AIO _ e a
 * ```
 *
 * Creates a `AIO` from the return value of a function that may throw, mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partial_<E, A>(thunk: () => A, onThrow: (error: unknown) => E): EIO<E, A> {
  return new PartialInstruction(thunk, onThrow);
}

/**
 * ```haskell
 * partial :: (Any -> e) -> (() -> a) -> AIO _ e a
 * ```
 *
 * Creates a `AIO` from the return value of a function that may throw, mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partial<E>(onThrow: (error: unknown) => E): <A>(thunk: () => A) => EIO<E, A> {
  return (thunk) => partial_(thunk, onThrow);
}

/**
 * ```haskell
 * suspend :: (() -> AIO r e a) -> AIO r e a
 * ```
 *
 * Creates a lazily-constructed `AIO`, whose construction itself may require effects
 *
 * @category Constructors
 * @since 1.0.0
 */
export function suspend<R, E, A>(factory: Lazy<AIO<R, E, A>>): AIO<R, E, A> {
  return new SuspendInstruction(factory);
}

/**
 * ```haskell
 * halt :: Cause e -> AIO _ e _
 * ```
 *
 * Creates a `AIO` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function halt<E>(cause: C.Cause<E>): EIO<E, never> {
  return new FailInstruction(cause);
}

/**
 * ```haskell
 * fail :: e -> AIO _ e _
 * ```
 *
 * Creates a `AIO` that has failed with value `e`. The moral equivalent of `throw`, except not immoral :)
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fail<E>(e: E): EIO<E, never> {
  return halt(C.fail(e));
}

/**
 * ```haskell
 * die :: Any -> AIO _ _ _
 * ```
 *
 * Creates a `AIO` that has died with the specified defect
 *
 * @category Constructors
 * @since 1.0.0
 */
export function die(e: unknown): EIO<never, never> {
  return halt(C.die(e));
}

/**
 * ```haskell
 * done :: Exit a b -> AIO _ a b
 * ```
 *
 * Creates a `AIO` from an exit value
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
