import { pipe } from "../Function";
import type { Cause } from "../IO/Cause";
import * as C from "../IO/Cause";
import type { Exit } from "../IO/Exit";
import * as Ref from "../IORef/_core";
import * as I from "./_internal/io";
import { Managed } from "./model";
import type { Finalizer, ReleaseMap } from "./ReleaseMap";
import { add, addIfOpen, noopFinalizer, release } from "./ReleaseMap";

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
  return makeExit_(Ref.make(initial), (ref, exit) => I.chain_(ref.get, (f) => f(exit)));
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
