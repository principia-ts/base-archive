import type { Cause } from "../Cause/core";
import type { Exit } from "../Exit/core";
import type { Fiber, FiberDescriptor, InterruptStatus } from "../Fiber/core";
import type { FiberId } from "../Fiber/FiberId";
import type { FiberContext } from "../FiberContext";
import type { FiberRef } from "../FiberRef/core";
import type { Scope } from "../Scope";
import type { SIO } from "../SIO";
import type { Supervisor } from "../Supervisor";
import type { Lazy } from "@principia/base/data/Function";
import type { Option } from "@principia/base/data/Option";
import type * as HKT from "@principia/base/HKT";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { _bind, _bindTo, flow, identity, pipe, tuple } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import { makeMonoid } from "@principia/base/Monoid";
import * as FL from "@principia/free/FreeList";

import * as C from "../Cause/core";
import * as Ex from "../Exit/core";
import * as I from "../Iterable";
import { _A, _E, _I, _R, _U, IOInstructionTag } from "./constants";

export { _A, _E, _I, _R, _U, IOInstructionTag } from "./constants";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export const URI = "IO";

export type URI = typeof URI;

export abstract class IO<R, E, A> {
  readonly [_U]: URI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void;

  readonly _S1!: (_: unknown) => void;
  readonly _S2!: () => never;

  get [_I](): Instruction {
    return this as any;
  }
}

export type Instruction =
  | FlatMapInstruction<any, any, any, any, any, any>
  | SucceedInstruction<any>
  | PartialInstruction<any, any>
  | TotalInstruction<any>
  | AsyncInstruction<any, any, any>
  | FoldInstruction<any, any, any, any, any, any, any, any, any>
  | ForkInstruction<any, any, any>
  | SetInterruptInstruction<any, any, any>
  | GetInterruptInstruction<any, any, any>
  | FailInstruction<any>
  | CheckDescriptorInstruction<any, any, any>
  | YieldInstruction
  | ReadInstruction<any, any, any, any>
  | GiveInstruction<any, any, any>
  | SuspendInstruction<any, any, any>
  | SuspendPartialInstruction<any, any, any, any>
  | NewFiberRefInstruction<any>
  | ModifyFiberRefInstruction<any, any>
  | RaceInstruction<any, any, any, any, any, any, any, any, any, any, any, any>
  | SuperviseInstruction<any, any, any>
  | GetForkScopeInstruction<any, any, any>
  | OverrideForkScopeInstruction<any, any, any>
  | SIO<unknown, never, any, any, any>
  | Integration<any, any, any>;

export type V = HKT.V<"E", "+"> & HKT.V<"R", "-">;

export type UIO<A> = IO<unknown, never, A>;
export type URIO<R, A> = IO<R, never, A>;
export type FIO<E, A> = IO<unknown, E, A>;

export type Canceler<R> = URIO<R, void>;

declare module "@principia/base/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: IO<R, E, A>;
  }
}

export class FlatMapInstruction<R, R1, E, E1, A, A1> extends IO<R & R1, E | E1, A1> {
  readonly _tag = IOInstructionTag.FlatMap;
  constructor(readonly io: IO<R, E, A>, readonly f: (a: A) => IO<R1, E1, A1>) {
    super();
  }
}

export class SucceedInstruction<A> extends IO<unknown, never, A> {
  readonly _tag = IOInstructionTag.Succeed;
  constructor(readonly value: A) {
    super();
  }
}

export class PartialInstruction<E, A> extends IO<unknown, E, A> {
  readonly _tag = IOInstructionTag.Partial;
  constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
    super();
  }
}

export class TotalInstruction<A> extends IO<unknown, never, A> {
  readonly _tag = IOInstructionTag.Total;
  constructor(readonly thunk: () => A) {
    super();
  }
}

export class AsyncInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Async;
  constructor(
    readonly register: (f: (_: IO<R, E, A>) => void) => Option<IO<R, E, A>>,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {
    super();
  }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends IO<
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _tag = IOInstructionTag.Fold;

  constructor(
    readonly io: IO<R, E, A>,
    readonly onFailure: (cause: Cause<E>) => IO<R1, E1, B>,
    readonly onSuccess: (a: A) => IO<R2, E2, C>
  ) {
    super();
  }

  apply(v: A): IO<R & R1 & R2, E1 | E2, B | C> {
    return this.onSuccess(v);
  }
}

export type FailureReporter = (e: Cause<unknown>) => void;

export class ForkInstruction<R, E, A> extends IO<R, never, FiberContext<E, A>> {
  readonly _tag = IOInstructionTag.Fork;

  constructor(
    readonly io: IO<R, E, A>,
    readonly scope: Option<Scope<Exit<any, any>>>,
    readonly reportFailure: Option<FailureReporter>
  ) {
    super();
  }
}

export class FailInstruction<E> extends IO<unknown, E, never> {
  readonly _tag = IOInstructionTag.Fail;

  constructor(readonly cause: Cause<E>) {
    super();
  }
}

export class YieldInstruction extends IO<unknown, never, void> {
  readonly _tag = IOInstructionTag.Yield;

  constructor() {
    super();
  }
}

export class ReadInstruction<R0, R, E, A> extends IO<R & R0, E, A> {
  readonly _tag = IOInstructionTag.Read;

  constructor(readonly f: (_: R0) => IO<R, E, A>) {
    super();
  }
}

export class GiveInstruction<R, E, A> extends IO<unknown, E, A> {
  readonly _tag = IOInstructionTag.Give;

  constructor(readonly io: IO<R, E, A>, readonly env: R) {
    super();
  }
}

export class SuspendInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Suspend;

  constructor(readonly factory: () => IO<R, E, A>) {
    super();
  }
}

export class RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends IO<
  R & R1 & R2 & R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "Race";

  constructor(
    readonly left: IO<R, E, A>,
    readonly right: IO<R1, E1, A1>,
    readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
    readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
    readonly scope: Option<Scope<Exit<any, any>>>
  ) {
    super();
  }
}

export class SetInterruptInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.SetInterrupt;

  constructor(readonly io: IO<R, E, A>, readonly flag: InterruptStatus) {
    super();
  }
}

export class GetInterruptInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.GetInterrupt;

  constructor(readonly f: (_: InterruptStatus) => IO<R, E, A>) {
    super();
  }
}

export class CheckDescriptorInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.CheckDescriptor;

  constructor(readonly f: (_: FiberDescriptor) => IO<R, E, A>) {
    super();
  }
}

export class SuperviseInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Supervise;

  constructor(readonly io: IO<R, E, A>, readonly supervisor: Supervisor<any>) {
    super();
  }
}

export class SuspendPartialInstruction<R, E, A, E2> extends IO<R, E | E2, A> {
  readonly _tag = IOInstructionTag.SuspendPartial;

  constructor(readonly factory: () => IO<R, E, A>, readonly onThrow: (u: unknown) => E2) {
    super();
  }
}

export class NewFiberRefInstruction<A> extends IO<unknown, never, FiberRef<A>> {
  readonly _tag = IOInstructionTag.NewFiberRef;

  constructor(
    readonly initial: A,
    readonly onFork: (a: A) => A,
    readonly onJoin: (a: A, a2: A) => A
  ) {
    super();
  }
}

export class ModifyFiberRefInstruction<A, B> extends IO<unknown, never, B> {
  readonly _tag = IOInstructionTag.ModifyFiberRef;

  constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
    super();
  }
}

export class GetForkScopeInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.GetForkScope;

  constructor(readonly f: (_: Scope<Exit<any, any>>) => IO<R, E, A>) {
    super();
  }
}

export class OverrideForkScopeInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.OverrideForkScope;

  constructor(readonly io: IO<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
    super();
  }
}

export const integrationNotImplemented = new FailInstruction({
  _tag: "Die",
  value: new Error("Integration not implemented or unsupported")
});

export abstract class Integration<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Integration;
  readonly _S1!: (_: unknown) => void;
  readonly _S2!: () => never;

  readonly [_U]!: URI;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  readonly [_R]!: (_: R) => void;

  get [_I](): Instruction {
    return integrationNotImplemented;
  }
}

/*
 * -------------------------------------------
 * Constructors
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
  return new SucceedInstruction(a);
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
 */
export function halt<E>(cause: C.Cause<E>): FIO<E, never> {
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
  return halt(C.fail(e));
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
  return halt(C.die(e));
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

/*
 * -------------------------------------------
 * Sequential Applicative
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `IO`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): UIO<A> {
  return new SucceedInstruction(a);
}

/*
 * -------------------------------------------
 * Sequential Apply
 * -------------------------------------------
 */

/**
 * ```haskell
 * product_ :: Apply f => (f a, f b) -> f [a, b]
 * ```
 *
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 */
export function product_<R, E, A, Q, D, B>(
  fa: IO<R, E, A>,
  fb: IO<Q, D, B>
): IO<Q & R, D | E, readonly [A, B]> {
  return map2_(fa, fb, tuple);
}

/**
 * ```haskell
 * product :: Apply f => f b -> f a -> f [a, b]
 * ```
 *
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst product_
 */
export function product<Q, D, B>(
  fb: IO<Q, D, B>
): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, readonly [A, B]> {
  return (fa) => product_(fa, fb);
}

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<Q, D, A, B, R, E>(
  fab: IO<Q, D, (a: A) => B>,
  fa: IO<R, E, A>
): IO<Q & R, D | E, B> {
  return map2_(fab, fa, (f, a) => f(a));
}

/**
 * ```haskell
 * ap :: Apply f => f (a -> b) -> f a -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst ap_
 */
export function ap<R, E, A>(
  fa: IO<R, E, A>
): <Q, D, B>(fab: IO<Q, D, (a: A) => B>) => IO<Q & R, E | D, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<R, E, A, Q, D, B>(fa: IO<R, E, A>, fb: IO<Q, D, B>): IO<Q & R, D | E, A> {
  return map2_(fa, fb, (a, _) => a);
}

/**
 * @dataFirst apFirst_
 */
export function apFirst<Q, D, B>(
  fb: IO<Q, D, B>
): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, A> {
  return (fa) => apFirst_(fa, fb);
}

/**
 * ```haskell
 * _apSecond :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond_<R, E, A, Q, D, B>(fa: IO<R, E, A>, fb: IO<Q, D, B>): IO<Q & R, D | E, B> {
  return map2_(fa, fb, (_, b) => b);
}

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst apSecond_
 */
export function apSecond<Q, D, B>(
  fb: IO<Q, D, B>
): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export const andThen_ = apSecond_;
/**
 * @dataFirst andThen_
 */
export const andThen = apSecond;

export function map2_<R, E, A, Q, D, B, C>(
  fa: IO<R, E, A>,
  fb: IO<Q, D, B>,
  f: (a: A, b: B) => C
): IO<Q & R, D | E, C> {
  return flatMap_(fa, (ra) => map_(fb, (rb) => f(ra, rb)));
}

/**
 * @dataFirst map2_
 */
export function map2<A, Q, D, B, C>(
  fb: IO<Q, D, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: IO<R, E, A>) => IO<Q & R, D | E, C> {
  return (fa) => map2_(fa, fb, f);
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

/**
 * Returns an IO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap_<R, E, A, G, B>(
  pab: IO<R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): IO<R, G, B> {
  return foldM_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  );
}

/**
 * Returns an IO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap<E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <R>(pab: IO<R, E, A>) => IO<R, G, B> {
  return (pab) => bimap_(pab, f, g);
}

/**
 * ```haskell
 * mapError_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an IO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapError_<R, E, A, D>(fea: IO<R, E, A>, f: (e: E) => D): IO<R, D, A> {
  return foldCauseM_(fea, flow(C.map(f), halt), succeed);
}

/**
 * ```haskell
 * mapError :: Bifunctor p => (a -> b) -> p a c -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an IO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapError<E, D>(f: (e: E) => D): <R, A>(fea: IO<R, E, A>) => IO<R, D, A> {
  return (fea) => mapError_(fea, f);
}

/*
 * -------------------------------------------
 * Fallible IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * absolve :: IO r e (Either e1 a) -> IO r (e | e1) a
 * ```
 *
 * Returns an `IO` that submerges an `Either` into the `IO`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absolve<R, E, E1, A>(ma: IO<R, E, E.Either<E1, A>>): IO<R, E | E1, A> {
  return flatMap_(ma, E.fold(fail, succeed));
}

/**
 * ```haskell
 * recover :: IO r e a -> IO r ~ (Either e a)
 * ```
 *
 * Folds an `IO` that may fail with `E` or succeed with `A` into one that never fails but succeeds with `Either<E, A>`
 */
export function recover<R, E, A>(ma: IO<R, E, A>): IO<R, never, E.Either<E, A>> {
  return fold_(ma, E.left, E.right);
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM_` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new FoldInstruction(ma, onFailure, onSuccess);
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => new FoldInstruction(ma, onFailure, onSuccess);
}

export function foldM_<R, R1, R2, E, E1, E2, A, A1, A2>(
  ma: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return foldCauseM_(ma, (cause) => E.fold_(C.failureOrCause(cause), onFailure, halt), onSuccess);
}

export function foldM<R1, R2, E, E1, E2, A, A1, A2>(
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => foldM_(ma, onFailure, onSuccess);
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, B, C>(
  fa: IO<R, E, A>,
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): IO<R, never, B | C> {
  return foldM_(fa, flow(onFailure, succeed), flow(onSuccess, succeed));
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold<E, A, B, C>(
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): <R>(ef: IO<R, E, A>) => IO<R, never, B | C> {
  return (ef) => fold_(ef, onFailure, onSuccess);
}

/*
 * -------------------------------------------
 * Functor IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<R, E, A, B>(fa: IO<R, E, A>, f: (a: A) => B): IO<R, E, B> {
  return flatMap_(fa, (a) => succeed(f(a)));
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: IO<R, E, A>) => IO<R, E, B> {
  return (fa) => map_(fa, f);
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

/**
 * ```haskell
 * flatMap_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatMap_<R, E, A, U, G, B>(
  ma: IO<R, E, A>,
  f: (a: A) => IO<U, G, B>
): IO<R & U, E | G, B> {
  return new FlatMapInstruction(ma, f);
}

/**
 * ```haskell
 * flatMap :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 * @dataFirst flatMap_
 */
export function flatMap<A, U, G, B>(
  f: (a: A) => IO<U, G, B>
): <R, E>(ma: IO<R, E, A>) => IO<R & U, G | E, B> {
  return (ma) => flatMap_(ma, f);
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `IO`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<R, E, Q, D, A>(ffa: IO<R, E, IO<Q, D, A>>) {
  return flatMap_(ffa, identity);
}

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<R, E, A, Q, D, B>(
  fa: IO<R, E, A>,
  f: (a: A) => IO<Q, D, B>
): IO<Q & R, D | E, A> {
  return flatMap_(fa, (a) =>
    pipe(
      f(a),
      flatMap(() => succeed(a))
    )
  );
}

/**
 * ```haskell
 * tap :: Monad m => (a -> m b) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 * @dataFirst tap_
 */
export function tap<A, Q, D, B>(
  f: (a: A) => IO<Q, D, B>
): <R, E>(fa: IO<R, E, A>) => IO<Q & R, D | E, A> {
  return (fa) => tap_(fa, f);
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

/**
 * ```haskell
 * asks :: MonadEnv m => (r -> a) -> m r a
 * ```
 *
 * Accesses the environment provided to an `IO`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function asks<R, A>(f: (_: R) => A): URIO<R, A> {
  return new ReadInstruction((_: R) => new SucceedInstruction(f(_)));
}

/**
 * ```haskell
 * asksM :: MonadEnv m => (q -> m r a) -> m (r & q) a
 * ```
 *
 * Effectfully accesses the environment provided to an `IO`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function asksM<Q, R, E, A>(f: (r: Q) => IO<R, E, A>): IO<R & Q, E, A> {
  return new ReadInstruction(f);
}

/**
 * ```haskell
 * giveAll_ :: MonadEnv m => (m r a, r) -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `IO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function giveAll_<R, E, A>(ma: IO<R, E, A>, r: R): FIO<E, A> {
  return new GiveInstruction(ma, r);
}

/**
 * ```haskell
 * giveAll :: MonadEnv m => r -> m r a -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `IO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function giveAll<R>(r: R): <E, A>(ma: IO<R, E, A>) => IO<unknown, E, A> {
  return (ma) => giveAll_(ma, r);
}

/**
 * ```haskell
 * gives_ :: MonadEnv m => (m r a, (r0 -> r)) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function gives_<R0, R, E, A>(ma: IO<R, E, A>, f: (r0: R0) => R) {
  return asksM((r0: R0) => giveAll_(ma, f(r0)));
}

/**
 * ```haskell
 * gives :: MonadEnv m => (r0 -> r) -> m r a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: IO<R, E, A>) => IO<R0, E, A> {
  return (ma) => gives_(ma, f);
}

/**
 * ```haskell
 * give_ :: MonadEnv m => (m (r & r0) a, r) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function give_<E, A, R = unknown, R0 = unknown>(ma: IO<R & R0, E, A>, r: R): IO<R0, E, A> {
  return gives_(ma, (r0) => ({ ...r0, ...r }));
}

/**
 * ```haskell
 * give :: MonadEnv m => r -> m (r & r0) a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function give<R = unknown>(
  r: R
): <E, A, R0 = unknown>(ma: IO<R & R0, E, A>) => IO<R0, E, A> {
  return (ma) => give_(ma, r);
}

export function ask<R>(): IO<R, never, R> {
  return asks((_: R) => _);
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): UIO<void> {
  return succeed(undefined);
}

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

const of: UIO<{}> = succeed({});
export { of as do };

export function bindS<R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => IO<R, E, A>
): <R2, E2>(
  mk: IO<R2, E2, K>
) => IO<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A;
  }
> {
  return flatMap((a) =>
    pipe(
      f(a),
      map((b) => _bind(a, name, b))
    )
  );
}

export function bindTo<K, N extends string>(
  name: Exclude<N, keyof K>
): <R, E, A>(fa: IO<R, E, A>) => IO<R, E, { [k in Exclude<N, keyof K>]: A }> {
  return (fa) => map_(fa, _bindTo(name));
}

export function letS<K, N extends string, A>(name: Exclude<N, keyof K>, f: (_: K) => A) {
  return bindS(name, flow(f, succeed));
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, A1>
): IO<R & R1, E1, A | A1> {
  return foldM_(ma, f, (x) => succeed(x));
}

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll<R, E, E2, A>(
  f: (e: E2) => IO<R, E, A>
): <R2, A2>(ma: IO<R2, E2, A2>) => IO<R2 & R, E, A | A2> {
  return (ma) => catchAll_(ma, f);
}

/**
 * When this IO succeeds with a cause, then this method returns a new
 * IO that either fails with the cause that this IO succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 */
export function uncause<R, E>(ma: IO<R, never, C.Cause<E>>): IO<R, E, void> {
  return flatMap_(ma, (a) => (C.isEmpty(a) ? unit() : halt(a)));
}

/**
 * Ignores the result of the IO, replacing it with unit
 *
 * @category Combinators
 * @since 1.0.0
 */
export function asUnit<R, E>(ma: IO<R, E, any>): IO<R, E, void> {
  return flatMap_(ma, () => unit());
}

/**
 * ```haskell
 * as_ :: (IO r e a, b) -> IO r e b
 * ```
 *
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function as_<R, E, A, B>(ma: IO<R, E, A>, b: () => B): IO<R, E, B> {
  return map_(ma, () => b());
}

/**
 * ```haskell
 * as :: b -> IO r e a -> IO r e b
 * ```
 *
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function as<B>(b: () => B): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, B> {
  return (ma) => as_(ma, b);
}

/**
 * ```haskell
 * asSomeError :: IO r e a -> IO r (Option e) a
 * ```
 *
 * Maps the error value of this IO to an optional value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const asSomeError: <R, E, A>(ma: IO<R, E, A>) => IO<R, O.Option<E>, A> = mapError(O.some);

export function cause<R, E, A>(ma: IO<R, E, A>): IO<R, never, Cause<E>> {
  return foldCauseM_(ma, succeed, () => succeed(C.empty));
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ifM_<R, E, R1, E1, A1, R2, E2, A2>(
  mb: IO<R, E, boolean>,
  onTrue: () => IO<R1, E1, A1>,
  onFalse: () => IO<R2, E2, A2>
): IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return flatMap_(mb, (x) => (x ? (onTrue() as IO<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()));
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ifM<R1, E1, A1, R2, E2, A2>(
  onTrue: () => IO<R1, E1, A1>,
  onFalse: () => IO<R2, E2, A2>
): <R, E>(b: IO<R, E, boolean>) => IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return (b) => ifM_(b, onTrue, onFalse);
}

export function if_<R, E, A, R1, E1, A1>(
  b: () => boolean,
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return ifM_(total(b), onTrue, onFalse);
}

function _if<R, E, A, R1, E1, A1>(
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): (b: () => boolean) => IO<R & R1, E | E1, A | A1> {
  return (b) => if_(b, onTrue, onFalse);
}
export { _if as if };

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced IOs sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreachUnit_<R, E, A>(as: Iterable<A>, f: (a: A) => IO<R, E, any>): IO<R, E, void> {
  return I.foldMap(makeMonoid<IO<R, E, void>>((x, y) => flatMap_(x, () => y), unit()))(f)(as);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced IOs sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreachUnit<R, E, A>(
  f: (a: A) => IO<R, E, any>
): (as: Iterable<A>) => IO<R, E, void> {
  return (as) => foreachUnit_(as, f);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreach_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, B>
): IO<R, E, ReadonlyArray<B>> {
  return map_(
    I.foldLeft_(as, succeed(FL.empty<B>()) as IO<R, E, FL.FreeList<B>>, (b, a) =>
      map2_(
        b,
        suspend(() => f(a)),
        (acc, r) => FL.append_(acc, r)
      )
    ),
    FL.toArray
  );
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreach<R, E, A, B>(
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f);
}

/**
 * Returns an IO that semantically runs the IO on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function result<R, E, A>(ma: IO<R, E, A>): IO<R, never, Exit<E, A>> {
  return new FoldInstruction(
    ma,
    (cause) => succeed(Ex.failure(cause)),
    (succ) => succeed(Ex.succeed(succ))
  );
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduce_<A, B, R, E>(
  as: Iterable<A>,
  b: B,
  f: (b: B, a: A) => IO<R, E, B>
): IO<R, E, B> {
  return A.foldLeft_(Array.from(as), succeed(b) as IO<R, E, B>, (acc, el) =>
    flatMap_(acc, (a) => f(a, el))
  );
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduce<R, E, A, B>(
  b: B,
  f: (b: B, a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, E, B> {
  return (as) => reduce_(as, b, f);
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduceRight_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => IO<R, E, Z>
): IO<R, E, Z> {
  return A.foldRight_(Array.from(i), succeed(zero) as IO<R, E, Z>, (el, acc) =>
    flatMap_(acc, (a) => f(el, a))
  );
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduceRight<A, Z, R, E>(
  zero: Z,
  f: (a: A, z: Z) => IO<R, E, Z>
): (i: Iterable<A>) => IO<R, E, Z> {
  return (i) => reduceRight_(i, zero, f);
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM_<R, E, A, R1, E1>(ma: IO<R, E, A>, mb: IO<R1, E1, boolean>) {
  return flatMap_(mb, (a) => (a ? asUnit(ma) : unit()));
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM<R, E>(
  mb: IO<R, E, boolean>
): <R1, E1, A>(ma: IO<R1, E1, A>) => IO<R & R1, E | E1, void> {
  return (ma) => whenM_(ma, mb);
}

export function when_<R, E, A>(ma: IO<R, E, A>, b: () => boolean) {
  return whenM_(ma, total(b));
}

export function when(b: () => boolean): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, void> {
  return (ma) => when_(ma, b);
}

/**
 * Returns an IO that effectually "peeks" at the cause of the failure of
 * this IO.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function tapCause_<R2, A2, R, E, E2>(
  ma: IO<R2, E2, A2>,
  f: (e: Cause<E2>) => IO<R, E, any>
): IO<R2 & R, E | E2, A2> {
  return foldCauseM_(ma, (c) => flatMap_(f(c), () => halt(c)), succeed);
}

/**
 * Returns an IO that effectually "peeks" at the cause of the failure of
 * this IO.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function tapCause<R, E, E1>(
  f: (e: Cause<E1>) => IO<R, E, any>
): <R1, A1>(ma: IO<R1, E1, A1>) => IO<R1 & R, E | E1, A1> {
  return (ma) => tapCause_(ma, f);
}

/**
 * Constructs an IO based on information about the current fiber, such as
 * its identity.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function descriptorWith<R, E, A>(f: (d: FiberDescriptor) => IO<R, E, A>): IO<R, E, A> {
  return new CheckDescriptorInstruction(f);
}

/**
 * Returns information about the current fiber, such as its identity.
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function descriptor(): IO<unknown, never, FiberDescriptor> {
  return descriptorWith(succeed);
}

/**
 * Checks the interrupt status, and produces the IO returned by the
 * specified callback.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function checkInterruptible<R, E, A>(f: (i: InterruptStatus) => IO<R, E, A>): IO<R, E, A> {
  return new GetInterruptInstruction(f);
}

/**
 * Returns an IO that forks this IO into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the IO.
 *
 * You can use the `fork` method whenever you want to execute an IO in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * IOs. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods interrupt the fiber and to
 * wait for it to finish executing the IO. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 */
export function fork<R, E, A>(ma: IO<R, E, A>): URIO<R, FiberContext<E, A>> {
  return new ForkInstruction(ma, O.none(), O.none());
}

/**
 * Returns an IO that forks this IO into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the IO.
 *
 * You can use the `fork` method whenever you want to execute an IO in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * IOs. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods interrupt the fiber and to
 * wait for it to finish executing the IO. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 */
export function forkReport(
  reportFailure: FailureReporter
): <R, E, A>(ma: IO<R, E, A>) => URIO<R, FiberContext<E, A>> {
  return (ma) => new ForkInstruction(ma, O.none(), O.some(reportFailure));
}
