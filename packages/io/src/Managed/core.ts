import type { Cause } from "../Cause";
import type { Exit } from "../Exit";
import type { Finalizer, ReleaseMap } from "./ReleaseMap";
import type { ReadonlyRecord } from "@principia/base/data/Record";
import type * as HKT from "@principia/base/HKT";
import type { _E, _R, EnforceNonEmptyRecord } from "@principia/base/util/types";

import * as E from "@principia/base/data/Either";
import { _bind, _bindTo, flow, identity, pipe } from "@principia/base/data/Function";
import * as R from "@principia/base/data/Record";

import * as C from "../Cause/core";
import * as Ex from "../Exit/core";
import * as Ref from "../IORef/core";
import * as I from "./_internal/io";
import { add, addIfOpen, noopFinalizer, release } from "./ReleaseMap";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export const URI = "Managed";

export type URI = typeof URI;

export type V = HKT.V<"R", "-"> & HKT.V<"E", "+">;

export class Managed<R, E, A> {
  readonly [I._U]: URI;
  readonly [I._R]: (_: R) => void;
  readonly [I._E]: () => E;
  readonly [I._A]: () => A;
  constructor(readonly io: I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>) {}
}

export type UManaged<A> = Managed<unknown, never, A>;
export type URManaged<R, A> = Managed<R, never, A>;
export type FManaged<E, A> = Managed<unknown, E, A>;

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Lift a pure value into an IO
 */
export function succeed<A>(a: A) {
  return fromEffect(I.pure(a));
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export function fromEffect<R, E, A>(effect: I.IO<R, E, A>) {
  return new Managed<R, E, A>(
    I.map_(
      I.asksM((_: readonly [R, ReleaseMap]) => I.giveAll_(effect, _[0])),
      (a) => [noopFinalizer, a]
    )
  );
}

export function fromEffectUninterruptible<R, E, A>(ma: I.IO<R, E, A>): Managed<R, E, A> {
  return fromEffect(I.makeUninterruptible(ma));
}

/**
 * Imports a synchronous side-effect into a Managed
 */
export function total<A>(thunk: () => A): Managed<unknown, never, A> {
  return fromEffect(I.total(thunk));
}

/**
 * Imports a synchronous side-effect that may throw into a Managed
 */
export function partial_<E, A>(
  thunk: () => A,
  onThrow: (error: unknown) => E
): Managed<unknown, E, A> {
  return fromEffect(I.partial_(thunk, onThrow));
}

/**
 * Imports a synchronous side-effect that may throw into a Managed
 */
export function partial<E>(
  onThrow: (error: unknown) => E
): <A>(thunk: () => A) => Managed<unknown, E, A> {
  return (thunk) => partial_(thunk, onThrow);
}

/**
 * Returns a Managed that models failure with the specified error. The moral equivalent of throw for pure code.
 */
export function fail<E>(e: E): Managed<unknown, E, never> {
  return fromEffect(I.fail(e));
}

/**
 * Returns a Managed that models failure with the specified `Cause`.
 */
export function halt<E>(cause: Cause<E>): Managed<unknown, E, never> {
  return fromEffect(I.halt(cause));
}

/**
 * Returns a Managed that dies with the specified error
 */
export function die(error: unknown): Managed<unknown, never, never> {
  return halt(C.die(error));
}

/**
 * Creates an IO that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export function finalizerRef(initial: Finalizer) {
  return makeExit_(Ref.make(initial), (ref, exit) => I.flatMap_(ref.get, (f) => f(exit)));
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make<R1, A>(
  release: (a: A) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  return makeExit((a) => release(a));
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  return makeExit_(acquire, (a) => release(a));
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit<R1, A>(
  release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  return (acquire) => makeExit_(acquire, release);
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  return new Managed<R & R1, E, A>(
    I.makeUninterruptible(
      pipe(
        I.do,
        I.bindS("r", () => I.ask<readonly [R & R1, ReleaseMap]>()),
        I.bindS("a", (s) => I.giveAll_(acquire, s.r[0])),
        I.bindS("rm", (s) => add((ex) => I.giveAll_(release(s.a, ex), s.r[0]))(s.r[1])),
        I.map((s) => [s.rm, s.a])
      )
    )
  );
}

/**
 * Creates a `Managed` from a `Reservation` produced by an IO. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 */
export function makeReserve<R, E, R2, E2, A>(reservation: I.IO<R, E, Reservation<R2, E2, A>>) {
  return new Managed<R & R2, E | E2, A>(
    I.uninterruptibleMask(({ restore }) =>
      pipe(
        I.do,
        I.bindS("tp", () => I.ask<readonly [R & R2, ReleaseMap]>()),
        I.letS("r", (s) => s.tp[0]),
        I.letS("releaseMap", (s) => s.tp[1]),
        I.bindS("reserved", (s) => I.giveAll_(reservation, s.r)),
        I.bindS("releaseKey", (s) =>
          addIfOpen((x) => I.giveAll_(s.reserved.release(x), s.r))(s.releaseMap)
        ),
        I.bindS("finalizerAndA", (s) => {
          const k = s.releaseKey;
          switch (k._tag) {
            case "None": {
              return I.interrupt;
            }
            case "Some": {
              return I.map_(
                restore(I.gives_(s.reserved.acquire, ([r]: readonly [R & R2, ReleaseMap]) => r)),
                (a): [Finalizer, A] => [(e) => release(k.value, e)(s.releaseMap), a]
              );
            }
          }
        }),
        I.map((s) => s.finalizerAndA)
      )
    )
  );
}

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 */
export class Reservation<R, E, A> {
  static of = <R, E, A, R2>(
    acquire: I.IO<R, E, A>,
    release: (exit: Exit<any, any>) => I.IO<R2, never, any>
  ) => new Reservation<R & R2, E, A>(acquire, release);

  private constructor(
    readonly acquire: I.IO<R, E, A>,
    readonly release: (exit: Exit<any, any>) => I.IO<R, never, any>
  ) {}
}

/**
 * Make a new reservation
 */
export function makeReservation_<R, E, A, R2>(
  acquire: I.IO<R, E, A>,
  release: (exit: Exit<any, any>) => I.IO<R2, never, any>
): Reservation<R & R2, E, A> {
  return Reservation.of(acquire, release);
}

/**
 * Make a new reservation
 */
export function makeReservation<R2>(
  release: (exit: Exit<any, any>) => I.IO<R2, never, any>
): <R, E, A>(acquire: I.IO<R, E, A>) => Reservation<R & R2, E, A> {
  return (acquire) => Reservation.of(acquire, release);
}

/**
 * Lifts a pure `Reservation<S, R, E, A>` into `Managed<S, R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export function reserve<R, E, A>(reservation: Reservation<R, E, A>): Managed<R, E, A> {
  return makeReserve(I.pure(reservation));
}

/**
 * Lifts an `Either` into a `ZManaged` value.
 */
export function fromEither<E, A>(ea: () => E.Either<E, A>): Managed<unknown, E, A> {
  return chain_(total(ea), E.fold(fail, succeed));
}

/**
 * Lifts a function `R => A` into a `Managed<R, never, A>`.
 */
export function fromFunction<R, A>(f: (r: R) => A): Managed<R, never, A> {
  return asks(f);
}

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 */
export function fromFunctionM<R, E, A>(f: (r: R) => I.IO<unknown, E, A>): Managed<R, E, A> {
  return asksM(f);
}

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 */
export function fromFunctionManaged<R, E, A>(
  f: (r: R) => Managed<unknown, E, A>
): Managed<R, E, A> {
  return asksManaged(f);
}

/*
 * -------------------------------------------
 * Sequential Applicative
 * -------------------------------------------
 */

export const pure = succeed;

/*
 * -------------------------------------------
 * Sequential Apply Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function map2<A, R1, E1, B, C>(
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, C> {
  return (fa) => map2_(fa, fb, f);
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function map2_<R, E, A, R1, E1, B, C>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
) {
  return chain_(fa, (a) => map_(fb, (a2) => f(a, a2)));
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function product_<R, E, A, R1, E1, A1>(self: Managed<R, E, A>, that: Managed<R1, E1, A1>) {
  return map2_(self, that, (a, a2) => [a, a2] as [A, A1]);
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function product<R1, E1, A1>(that: Managed<R1, E1, A1>) {
  return <R, E, A>(self: Managed<R, E, A>) => map2_(self, that, (a, a2) => [a, a2] as [A, A1]);
}

export function ap_<R, E, A, Q, D, B>(
  fab: Managed<Q, D, (a: A) => B>,
  fa: Managed<R, E, A>
): Managed<Q & R, D | E, B> {
  return map2_(fab, fa, (f, a) => f(a));
}

export function ap<R, E, A>(
  fa: Managed<R, E, A>
): <Q, D, B>(fab: Managed<Q, D, (a: A) => B>) => Managed<Q & R, E | D, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A> {
  return map2_(fa, fb, (a, _) => a);
}

export function apFirst<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return map2_(fa, fb, (_, b) => b);
}

export function apSecond<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export const struct = <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
  mr: EnforceNonEmptyRecord<MR> & Record<string, Managed<any, any, any>>
): Managed<
  _R<MR[keyof MR]>,
  _E<MR[keyof MR]>,
  {
    [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never;
  }
> =>
  map_(
    foreach_(
      R.collect_(mr, (k, v) => [k, v] as const),
      ([k, v]) => map_(v, (a) => [k, a] as const)
    ),
    (kvs) => {
      const r = {};
      for (let i = 0; i < kvs.length; i++) {
        const [k, v] = kvs[i];
        r[k] = v;
      }
      return r;
    }
  ) as any;

export const tuple = <T extends ReadonlyArray<Managed<any, any, any>>>(
  ...mt: T & {
    0: Managed<any, any, any>;
  }
): Managed<
  _R<T[number]>,
  _E<T[number]>,
  { [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never }
> => foreach_(mt, identity) as any;

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<R, E, A, B, C>(
  pab: Managed<R, E, A>,
  f: (e: E) => B,
  g: (a: A) => C
): Managed<R, B, C> {
  return new Managed(I.bimap_(pab.io, f, ([fin, a]) => [fin, g(a)]));
}

export function bimap<E, A, B, C>(
  f: (e: E) => B,
  g: (a: A) => C
): <R>(pab: Managed<R, E, A>) => Managed<R, B, C> {
  return (pab) => bimap_(pab, f, g);
}

export function mapError_<R, E, A, D>(pab: Managed<R, E, A>, f: (e: E) => D): Managed<R, D, A> {
  return new Managed(I.mapError_(pab.io, f));
}

export function mapError<E, D>(f: (e: E) => D): <R, A>(pab: Managed<R, E, A>) => Managed<R, D, A> {
  return (pab) => mapError_(pab, f);
}

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause_<R, E, A, D>(
  ma: Managed<R, E, A>,
  f: (e: Cause<E>) => Cause<D>
): Managed<R, D, A> {
  return new Managed(I.mapErrorCause_(ma.io, f));
}

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause<E, D>(
  f: (e: Cause<E>) => Cause<D>
): <R, A>(ma: Managed<R, E, A>) => Managed<R, D, A> {
  return (ma) => mapErrorCause_(ma, f);
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 */
export const absolve: <R, E, E1, A>(
  fa: Managed<R, E, E.Either<E1, A>>
) => Managed<R, E | E1, A> = chain((ea) => fromEither(() => ea));

export const recover: <R, E, A>(fa: Managed<R, E, A>) => Managed<R, never, E.Either<E, A>> = foldM(
  flow(E.left, succeed),
  flow(E.right, succeed)
);

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Managed<R & R1 & R2, E1 | E2, A1 | A2>(
    pipe(
      ma.io,
      I.foldCauseM(
        (c) => onFailure(c).io,
        ([_, a]) => onSuccess(a).io
      )
    )
  );
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => foldCauseM_(ma, onFailure, onSuccess);
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export function foldM_<R, E, A, R1, E1, B, R2, E2, C>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): Managed<R & R1 & R2, E1 | E2, B | C> {
  return foldCauseM_(ma, flow(C.failureOrCause, E.fold(f, halt)), g);
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export function foldM<E, A, R1, E1, B, R2, E2, C>(
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, B | C> {
  return (ma) => foldM_(ma, f, g);
}

export function fold_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return foldM_(ma, flow(onError, succeed), flow(onSuccess, succeed));
}

export function fold<E, A, B, C>(
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => fold_(ma, onError, onSuccess);
}

export function foldCause_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return fold_(sandbox(ma), onFailure, onSuccess);
}

export function foldCause<E, A, B, C>(
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => foldCause_(ma, onFailure, onSuccess);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function map_<R, E, A, B>(fa: Managed<R, E, A>, f: (a: A) => B): Managed<R, E, B> {
  return new Managed<R, E, B>(I.map_(fa.io, ([fin, a]) => [fin, f(a)]));
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Managed<R, E, A>) => Managed<R, E, B> {
  return (fa) => map_(fa, f);
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return new Managed<R & R1, E | E1, B>(
    I.flatMap_(fa.io, ([fin, a]) =>
      I.gives_(
        I.map_(f(a), (b) => [fin, b]),
        ([r]: readonly [R & R1, ReleaseMap]) => r
      )
    )
  );
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM<R1, E1, A, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => mapM_(fa, f);
}

/*
 * -------------------------------------------
 * Monad Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function chain<R1, E1, A, A1>(
  f: (a: A) => Managed<R1, E1, A1>
): <R, E>(self: Managed<R, E, A>) => Managed<R & R1, E1 | E, A1> {
  return (self) => chain_(self, f);
}

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function chain_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R1, E1, A1>
): Managed<R & R1, E | E1, A1> {
  return new Managed<R & R1, E | E1, A1>(
    I.flatMap_(self.io, ([releaseSelf, a]) =>
      I.map_(f(a).io, ([releaseThat, b]) => [
        (e) =>
          I.flatMap_(I.result(releaseThat(e)), (e1) =>
            I.flatMap_(I.result(releaseSelf(e1)), (e2) => I.done(Ex.apSecond_(e1, e2)))
          ),
        b
      ])
    )
  );
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap_<R, E, A, Q, D>(
  ma: Managed<R, E, A>,
  f: (a: A) => Managed<Q, D, any>
): Managed<R & Q, E | D, A> {
  return chain_(ma, (a) => map_(f(a), () => a));
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap<R1, E1, A>(
  f: (a: A) => Managed<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => tap_(ma, f);
}

export const flatten: <R, E, R1, E1, A>(
  mma: Managed<R, E, Managed<R1, E1, A>>
) => Managed<R & R1, E | E1, A> = chain(identity);

export const flattenM: <R, E, R1, E1, A>(
  mma: Managed<R, E, I.IO<R1, E1, A>>
) => Managed<R & R1, E | E1, A> = mapM(identity);

export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return foldM_(
    ma,
    (e) => chain_(f(e), () => fail(e)),
    (a) => map_(g(a), () => a)
  );
}

export function tapBoth<E, A, R1, E1, R2, E2>(
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E | E1 | E2, A> {
  return (ma) => tapBoth_(ma, f, g);
}

export function tapCause_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(ma, (c) => chain_(f(c), () => halt(c)));
}

export function tapCause<E, R1, E1>(
  f: (c: Cause<E>) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapCause_(ma, f);
}

export function tapError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return tapBoth_(ma, f, succeed);
}

export function tapError<E, R1, E1>(
  f: (e: E) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapError_(ma, f);
}

export function tapM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return mapM_(ma, (a) => I.as_(f(a), () => a));
}

export function tapM<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapM_(ma, f);
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): Managed<R, never, R> {
  return fromEffect(I.ask<R>());
}

export function asks<R, A>(f: (r: R) => A): Managed<R, never, A> {
  return map_(ask<R>(), f);
}

export function asksM<R0, R, E, A>(f: (r: R0) => I.IO<R, E, A>): Managed<R0 & R, E, A> {
  return mapM_(ask<R0>(), f);
}

export function asksManaged<R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> {
  return chain_(ask<R0>(), f);
}

/**
 * Modify the environment required to run a Managed
 */
export function gives_<R, E, A, R0>(ma: Managed<R, E, A>, f: (r0: R0) => R): Managed<R0, E, A> {
  return new Managed(
    I.asksM(([r0, rm]: readonly [R0, ReleaseMap]) => I.giveAll_(ma.io, [f(r0), rm]))
  );
}

/**
 * Modify the environment required to run a Managed
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: Managed<R, E, A>) => Managed<R0, E, A> {
  return (ma) => gives_(ma, f);
}

export function giveAll_<R, E, A>(ma: Managed<R, E, A>, env: R): Managed<unknown, E, A> {
  return gives_(ma, () => env);
}

export function giveAll<R>(env: R): <E, A>(ma: Managed<R, E, A>) => Managed<unknown, E, A> {
  return (ma) => giveAll_(ma, env);
}

export function give_<E, A, R = unknown, R0 = unknown>(
  ma: Managed<R & R0, E, A>,
  env: R
): Managed<R0, E, A> {
  return gives_(ma, (r0) => ({ ...r0, ...env }));
}

export function give<R>(env: R): <R0, E, A>(ma: Managed<R & R0, E, A>) => Managed<R0, E, A> {
  return (ma) => give_(ma, env);
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Managed<unknown, never, void> {
  return fromEffect(I.unit());
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export function foreach<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, readonly B[]> {
  return (as) => foreach_(as, f);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 */
export function foreach_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>) {
  return new Managed<R, E, readonly B[]>(
    I.map_(
      I.foreach_(as, (a) => f(a).io),
      (res) => {
        const fins = res.map((k) => k[0]);
        const as = res.map((k) => k[1]);

        return [(e) => I.foreach_(fins.reverse(), (fin) => fin(e)), as];
      }
    )
  );
}

/**
 * Exposes the full cause of failure of this Managed.
 */
export function sandbox<R, E, A>(ma: Managed<R, E, A>): Managed<R, Cause<E>, A> {
  return new Managed(I.sandbox(ma.io));
}

/**
 * The inverse operation of `sandbox`
 */
export const unsandbox: <R, E, A>(ma: Managed<R, Cause<E>, A>) => Managed<R, E, A> = mapErrorCause(
  C.flatten
);

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (ma: Managed<R, Cause<E>, A>) => Managed<R1, Cause<E1>, B>
): Managed<R & R1, E | E1, B> {
  return unsandbox(f(sandbox(ma)));
}

export function catchAll_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return foldM_(ma, f, succeed);
}

export function catchAll<E, R1, E1, B>(
  f: (e: E) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAll_(ma, f);
}

export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: Cause<E>) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return foldCauseM_(ma, f, succeed);
}

export function catchAllCause<E, R1, E1, B>(
  f: (e: Cause<E>) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAllCause_(ma, f);
}

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

const of = succeed({});
export { of as do };

export function bindS<R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>
): <R2, E2>(
  mk: Managed<R2, E2, K>
) => Managed<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A;
  }
> {
  return chain((a) =>
    pipe(
      f(a),
      map((b) => _bind(a, name, b))
    )
  );
}

export function bindTo<K, N extends string>(
  name: Exclude<N, keyof K>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R, E, { [k in Exclude<N, keyof K>]: A }> {
  return (fa) => map_(fa, _bindTo(name));
}

export function letS<K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
): <R2, E2>(
  mk: Managed<R2, E2, K>
) => Managed<R2, E2, { [k in N | keyof K]: k extends keyof K ? K[k] : A }> {
  return bindS(name, flow(f, succeed));
}
