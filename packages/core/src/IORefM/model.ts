import * as I from "../IO/_core";
import type { Semaphore } from "../IO/Semaphore";
import { withPermit } from "../IO/Semaphore";
import type { URef } from "../IORef";

/**
 * An `IORefM<RA, RB, EA, EB, A, B>` is a polymorphic, purely functional
 * description of a mutable reference. The fundamental operations of a `IORefM`
 * are `set` and `get`. `set` takes a value of type `A` and sets the reference
 * to a new value, requiring an environment of type `RA` and potentially
 * failing with an error of type `EA`. `get` gets the current value of the
 * reference and returns a value of type `B`, requiring an environment of type
 * `RB` and potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `IORefM` are unified, that is, it is a
 * `IORefM<RA, RB, E, E, A, A>`, the `IORefM` also supports atomic `modify` and `update`
 * operations.
 *
 * Unlike `IORef`, `IORefM` allows performing effects within update operations,
 * at some cost to performance. Writes will semantically block other writers,
 * while multiple readers can read simultaneously.
 */
export interface IORefM<RA, RB, EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `IORefM`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `IORefM`. For most use cases one of the more
   * specific combinators implemented in terms of `foldM` will be more
   * ergonomic but this method is extremely useful for implementing new
   * combinators.
   */
  readonly foldM: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ) => IORefM<RA & RC, RB & RD, EC, ED, C, D>;

  /**
   * Folds over the error and value types of the `IORefM`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `foldM` but requires unifying the environment and error types.
   */
  readonly foldAllM: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ) => IORefM<RB & RA & RC, RB & RD, EC, ED, C, D>;

  /**
   * Reads the value from the `IORefM`.
   */
  readonly get: I.IO<RB, EB, B>;

  /**
   * Writes a new value to the `IORefM`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => I.IO<RA, EA, void>;
}

export class DerivedAll<RA, RB, EA, EB, A, B, S> implements IORefM<RA, RB, EA, EB, A, B> {
  readonly _tag = "DerivedAll";

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => I.IO<RB, EB, B>,
    readonly setEither: (a: A) => (s: S) => I.IO<RA, EA, S>
  ) {}

  readonly foldM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): IORefM<RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAll<RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        I.foldM_(
          this.getEither(s),
          (e) => I.fail(eb(e)),
          (a) => bd(a)
        ),
      (a) => (s) => I.chain_(ca(a), (a) => I.mapError_(this.setEither(a)(s), ea))
    );

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): IORefM<RB & RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAll<RB & RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        I.foldM_(
          this.getEither(s),
          (e) => I.fail(eb(e)),
          (a) => bd(a)
        ),
      (c) => (s) =>
        I.chain_(
          I.foldM_(this.getEither(s), (e) => I.fail(ec(e)), ca(c)),
          (a) => I.mapError_(this.setEither(a)(s), ea)
        )
    );

  get: I.IO<RB, EB, B> = I.chain_(this.value.get, (a) => this.getEither(a));

  set: (a: A) => I.IO<RA, EA, void> = (a) =>
    withPermit(this.value.semaphore)(
      I.chain_(I.chain_(this.value.get, this.setEither(a)), (a) => this.value.set(a))
    );
}

export class Derived<RA, RB, EA, EB, A, B, S> implements IORefM<RA, RB, EA, EB, A, B> {
  readonly _tag = "Derived";

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => I.IO<RB, EB, B>,
    readonly setEither: (a: A) => I.IO<RA, EA, S>
  ) {}

  readonly foldM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): IORefM<RA & RC, RB & RD, EC, ED, C, D> =>
    new Derived<RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        I.foldM_(
          this.getEither(s),
          (e) => I.fail(eb(e)),
          (a) => bd(a)
        ),
      (a) => I.chain_(ca(a), (a) => I.mapError_(this.setEither(a), ea))
    );

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): IORefM<RB & RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAll<RB & RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        I.foldM_(
          this.getEither(s),
          (e) => I.fail(eb(e)),
          (a) => bd(a)
        ),
      (c) => (s) =>
        I.chain_(
          I.foldM_(this.getEither(s), (e) => I.fail(ec(e)), ca(c)),
          (a) => I.mapError_(this.setEither(a), ea)
        )
    );

  get: I.IO<RB, EB, B> = I.chain_(this.value.get, (a) => this.getEither(a));

  set: (a: A) => I.IO<RA, EA, void> = (a) =>
    withPermit(this.value.semaphore)(I.chain_(this.setEither(a), (a) => this.value.set(a)));
}

export class Atomic<A> implements IORefM<unknown, unknown, never, never, A, A> {
  readonly _tag = "Atomic";

  constructor(readonly ref: URef<A>, readonly semaphore: Semaphore) {}

  readonly foldM = <RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): IORefM<RC, RD, EC, ED, C, D> =>
    new Derived<RC, RD, EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (a) => ca(a)
    );

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): IORefM<RC, RD, EC, ED, C, D> =>
    new DerivedAll<RC, RD, EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (a) => (s) => ca(a)(s)
    );

  readonly get: I.IO<unknown, never, A> = this.ref.get;

  readonly set: (a: A) => I.IO<unknown, never, void> = (a) =>
    withPermit(this.semaphore)(this.set(a));
}

export interface RefMRE<R, E, A> extends IORefM<R, R, E, E, A, A> {}
export interface FRefM<E, A> extends IORefM<unknown, unknown, E, E, A, A> {}
export interface URRefM<R, A> extends IORefM<R, R, never, never, A, A> {}
export interface URefM<A> extends IORefM<unknown, unknown, never, never, A, A> {}

export const concrete = <RA, RB, EA, EB, A>(_: IORefM<RA, RB, EA, EB, A, A>) =>
  _ as Atomic<A> | Derived<RA, RB, EA, EB, A, A, A> | DerivedAll<RA, RB, EA, EB, A, A, A>;
