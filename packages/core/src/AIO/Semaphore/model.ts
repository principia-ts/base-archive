import type { Either } from "../../Either";
import * as E from "../../Either";
import { identity, pipe } from "../../Function";
import * as O from "../../Option";
import { ImmutableQueue } from "../../Utils/support/ImmutableQueue";
import * as T from "../AIO/_core";
import { bracket_ } from "../AIO/combinators/bracket";
import * as M from "../Managed/_core";
import type { XPromise } from "../XPromise";
import { await as promiseWait } from "../XPromise/combinators/await";
import { make as promiseMake } from "../XPromise/combinators/make";
import { succeed_ as promiseSucceed } from "../XPromise/combinators/succeed";
import * as XR from "../XRef/_core";
import type { Ref } from "../XRef/model";

export type Entry = [XPromise<never, void>, number];
export type State = Either<ImmutableQueue<Entry>, number>;

export class Acquisition {
  constructor(readonly waitAcquire: T.IO<void>, readonly release: T.IO<void>) {}
}

/**
 * An asynchronous semaphore, which is a generalization of a mutex. Semaphores
 * have a certain number of permits, which can be held and released
 * concurrently by different parties. Attempts to acquire more permits than
 * available result in the acquiring fiber being suspended until the specified
 * number of permits become available.
 **/
export class Semaphore {
  constructor(private readonly state: Ref<State>) {
    this.loop = this.loop.bind(this);
    this.restore = this.restore.bind(this);
    this.releaseN = this.releaseN.bind(this);
    this.restore = this.restore.bind(this);
  }

  get available() {
    return T.map_(
      this.state.get,
      E.fold(() => 0, identity)
    );
  }

  private loop(n: number, state: State, acc: T.IO<void>): [T.IO<void>, State] {
    switch (state._tag) {
      case "Right": {
        return [acc, E.right(n + state.right)];
      }
      case "Left": {
        return O.fold_(
          state.left.dequeue(),
          (): [T.IO<void>, E.Either<ImmutableQueue<Entry>, number>] => [acc, E.right(n)],
          ([[p, m], q]): [T.IO<void>, E.Either<ImmutableQueue<Entry>, number>] => {
            if (n > m) {
              return this.loop(n - m, E.left(q), T.apFirst_(acc, promiseSucceed(p, undefined)));
            } else if (n === m) {
              return [T.apFirst_(acc, promiseSucceed(p, undefined)), E.left(q)];
            } else {
              return [acc, E.left(q.prepend([p, m - n]))];
            }
          }
        );
      }
    }
  }

  private releaseN(toRelease: number): T.IO<void> {
    return T.flatten(
      T.chain_(assertNonNegative(toRelease), () =>
        pipe(
          this.state,
          XR.modify((s) => this.loop(toRelease, s, T.unit()))
        )
      )
    );
  }

  private restore(p: XPromise<never, void>, n: number): T.IO<void> {
    return T.flatten(
      pipe(
        this.state,
        XR.modify(
          E.fold(
            (q) =>
              O.fold_(
                q.find(([a]) => a === p),
                (): [T.IO<void>, E.Either<ImmutableQueue<Entry>, number>] => [
                  this.releaseN(n),
                  E.left(q)
                ],
                (x): [T.IO<void>, E.Either<ImmutableQueue<Entry>, number>] => [
                  this.releaseN(n - x[1]),
                  E.left(q.filter(([a]) => a != p))
                ]
              ),
            (m): [T.IO<void>, E.Either<ImmutableQueue<Entry>, number>] => [T.unit(), E.right(n + m)]
          )
        )
      )
    );
  }

  prepare(n: number) {
    if (n === 0) {
      return T.pure(new Acquisition(T.unit(), T.unit()));
    } else {
      return T.chain_(promiseMake<never, void>(), (p) =>
        pipe(
          this.state,
          XR.modify(
            E.fold(
              (q): [Acquisition, E.Either<ImmutableQueue<Entry>, number>] => [
                new Acquisition(promiseWait(p), this.restore(p, n)),
                E.left(q.push([p, n]))
              ],
              (m): [Acquisition, E.Either<ImmutableQueue<Entry>, number>] => {
                if (m >= n) {
                  return [new Acquisition(T.unit(), this.releaseN(n)), E.right(m - n)];
                }
                return [
                  new Acquisition(promiseWait(p), this.restore(p, n)),
                  E.left(new ImmutableQueue([[p, n - m]]))
                ];
              }
            )
          )
        )
      );
    }
  }
}

/**
 * Acquires `n` permits, executes the action and releases the permits right after.
 */
export function withPermits_<R, E, A>(
  aio: T.AIO<R, E, A>,
  n: number,
  s: Semaphore
): T.AIO<R, E, A> {
  return bracket_(
    s.prepare(n),
    (a) => T.chain_(a.waitAcquire, () => aio),
    (a) => a.release
  );
}

/**
 * Acquires `n` permits, executes the action and releases the permits right after.
 */
export function withPermits(n: number, s: Semaphore) {
  return <R, E, A>(aio: T.AIO<R, E, A>) => withPermits_(aio, n, s);
}

/**
 * Acquires a permit, executes the action and releases the permit right after.
 */
export function withPermit_<R, E, A>(aio: T.AIO<R, E, A>, s: Semaphore): T.AIO<R, E, A> {
  return withPermits_(aio, 1, s);
}

/**
 * Acquires a permit, executes the action and releases the permit right after.
 */
export function withPermit(s: Semaphore): <R, E, A>(aio: T.AIO<R, E, A>) => T.AIO<R, E, A> {
  return (aio) => withPermit_(aio, s);
}

/**
 * Acquires `n` permits in a `Managed` and releases the permits in the finalizer.
 */
export function withPermitsManaged(n: number): (s: Semaphore) => M.Managed<unknown, never, void> {
  return (s) =>
    M.makeReserve(T.map_(s.prepare(n), (a) => M.makeReservation(() => a.release)(a.waitAcquire)));
}

/**
 * Acquires a permit in a `Managed` and releases the permit in the finalizer.
 */
export function withPermitManaged(s: Semaphore) {
  return withPermitsManaged(1)(s);
}

/**
 * The number of permits currently available.
 */
export function available(s: Semaphore): T.AIO<unknown, never, number> {
  return s.available;
}

/**
 * Creates a new `Sempahore` with the specified number of permits.
 */
export function make(permits: number): T.AIO<unknown, never, Semaphore> {
  return T.map_(XR.make<State>(E.right(permits)), (state) => new Semaphore(state));
}

/**
 * Creates a new `Sempahore` with the specified number of permits.
 */
export function unsafeMake(permits: number): Semaphore {
  const state = XR.unsafeMake<State>(E.right(permits));

  return new Semaphore(state);
}

function assertNonNegative(n: number) {
  return n < 0 ? T.die(`Unexpected negative value ${n} passed to acquireN or releaseN.`) : T.unit();
}
