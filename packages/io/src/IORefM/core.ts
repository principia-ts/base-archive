import type { UIO } from '../IO/core'
import type { URef } from '../IORef'
import type { UManaged } from '../Managed/core'
import type { Semaphore } from '../Semaphore'

import * as E from '@principia/base/Either'
import { identity, pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import { matchTag } from '@principia/base/util/matchers'

import * as Ref from '../IORef'
import * as M from '../Managed/core'
import * as Q from '../Queue'
import { withPermit } from '../Semaphore'
import * as S from '../Semaphore'
import * as I from './_internal/io'

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
  ) => IORefM<RA & RC, RB & RD, EC, ED, C, D>

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
  ) => IORefM<RB & RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Reads the value from the `IORefM`.
   */
  readonly get: I.IO<RB, EB, B>

  /**
   * Writes a new value to the `IORefM`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => I.IO<RA, EA, void>
}

export class DerivedAll<RA, RB, EA, EB, A, B, S> implements IORefM<RA, RB, EA, EB, A, B> {
  readonly _tag = 'DerivedAll'

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
      (a) => (s) => I.flatMap_(ca(a), (a) => I.mapError_(this.setEither(a)(s), ea))
    )

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
        I.flatMap_(
          I.foldM_(this.getEither(s), (e) => I.fail(ec(e)), ca(c)),
          (a) => I.mapError_(this.setEither(a)(s), ea)
        )
    )

  get: I.IO<RB, EB, B> = I.flatMap_(this.value.get, (a) => this.getEither(a))

  set: (a: A) => I.IO<RA, EA, void> = (a) =>
    withPermit(this.value.semaphore)(
      I.flatMap_(I.flatMap_(this.value.get, this.setEither(a)), (a) => this.value.set(a))
    )
}

export class Derived<RA, RB, EA, EB, A, B, S> implements IORefM<RA, RB, EA, EB, A, B> {
  readonly _tag = 'Derived'

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
      (a) => I.flatMap_(ca(a), (a) => I.mapError_(this.setEither(a), ea))
    )

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
        I.flatMap_(
          I.foldM_(this.getEither(s), (e) => I.fail(ec(e)), ca(c)),
          (a) => I.mapError_(this.setEither(a), ea)
        )
    )

  get: I.IO<RB, EB, B> = I.flatMap_(this.value.get, (a) => this.getEither(a))

  set: (a: A) => I.IO<RA, EA, void> = (a) =>
    withPermit(this.value.semaphore)(I.flatMap_(this.setEither(a), (a) => this.value.set(a)))
}

export class Atomic<A> implements IORefM<unknown, unknown, never, never, A, A> {
  readonly _tag = 'Atomic'

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
    )

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
    )

  readonly get: I.IO<unknown, never, A> = this.ref.get

  readonly set: (a: A) => I.IO<unknown, never, void> = (a) => withPermit(this.semaphore)(this.set(a))
}

export interface RefMRE<R, E, A> extends IORefM<R, R, E, E, A, A> {}
export interface FRefM<E, A> extends IORefM<unknown, unknown, E, E, A, A> {}
export interface URRefM<R, A> extends IORefM<R, R, never, never, A, A> {}
export interface URefM<A> extends IORefM<unknown, unknown, never, never, A, A> {}

export const concrete = <RA, RB, EA, EB, A>(_: IORefM<RA, RB, EA, EB, A, A>) =>
  _ as Atomic<A> | Derived<RA, RB, EA, EB, A, A, A> | DerivedAll<RA, RB, EA, EB, A, A, A>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Creates a new `XRefM` with the specified value.
 */
export function make<A>(a: A): UIO<URefM<A>> {
  return pipe(
    I.do,
    I.bindS('ref', () => Ref.make(a)),
    I.bindS('semaphore', () => S.make(1)),
    I.map(({ ref, semaphore }) => new Atomic(ref, semaphore))
  )
}

/**
 * Creates a new `XRefM` with the specified value.
 */
export function unsafeMake<A>(a: A): URefM<A> {
  const ref       = Ref.unsafeMake(a)
  const semaphore = S.unsafeMake(1)
  return new Atomic(ref, semaphore)
}

/**
 * Creates a new `RefM` with the specified value in the context of a
 * `Managed.`
 */
export function makeManaged<A>(a: A): UManaged<URefM<A>> {
  return pipe(make(a), M.fromEffect)
}

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export function dequeueRef<A>(a: A): UIO<[URefM<A>, Q.Dequeue<A>]> {
  return pipe(
    I.do,
    I.bindS('ref', () => make(a)),
    I.bindS('queue', () => Q.makeUnbounded<A>()),
    I.map(({ queue, ref }) => [
      pipe(
        ref,
        tapInput((a) => queue.offer(a))
      ),
      queue
    ])
  )
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM_<RA, RB, EA, EB, B, A, RC, EC, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): IORefM<RA & RC, RB, EC | EA, EB, C, B> {
  return dimapM_(self, f, I.pure)
}

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM<A, RC, EC, C>(
  f: (c: C) => I.IO<RC, EC, A>
): <RA, RB, EA, EB, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA & RC, RB, EC | EA, EB, C, B> {
  return (self) => contramapM_(self, f)
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): IORefM<RA, RB, EA, EB, C, B> {
  return contramapM_(self, (c) => I.pure(f(c)))
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap<C, A>(
  f: (c: C) => A
): <RA, RB, EA, EB, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, EB, C, B> {
  return (self) => contramap_(self, f)
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, boolean>
): IORefM<RA & RC, RB, O.Option<EC | EA>, EB, A1, B> {
  return pipe(
    self,
    foldM(
      (ea) => O.some<EA | EC>(ea),
      identity,
      (a: A1) =>
        I.ifM_(
          I.asSomeError(f(a)),
          () => I.pure(a),
          () => I.fail<O.Option<EA | EC>>(O.none())
        ),
      I.pure
    )
  )
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA & RC, RB, O.Option<EA | EC>, EB, A1, B> {
  return (self) => filterInputM_(self, f)
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A = A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => boolean
): IORefM<RA, RB, O.Option<EA>, EB, A1, B> {
  return filterInputM_(self, (a) => I.pure(f(a)))
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A = A>(
  f: (a: A1) => boolean
): <RA, RB, EA, EB, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, O.Option<EA>, EB, A1, B> {
  return (self) => filterInput_(self, f)
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM_<RA, RB, EA, EB, A, B, RC, EC>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, boolean>
): IORefM<RA, RB & RC, EA, O.Option<EC | EB>, A, B> {
  return foldM_(
    self,
    (ea) => ea,
    (eb) => O.some<EB | EC>(eb),
    (a) => I.pure(a),
    (b) =>
      I.ifM_(
        I.asSomeError(f(b)),
        () => I.pure(b),
        () => I.fail(O.none())
      )
  )
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB & RC, EA, O.Option<EB | EC>, A, B> {
  return (self) => filterOutputM_(self, f)
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): IORefM<RA, RB, EA, O.Option<EB>, A, B> {
  return filterOutputM_(self, (b) => I.pure(f(b)))
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (b: B) => boolean
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, O.Option<EB>, A, B> {
  return (self) => filterOutput_(self, f)
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * Folds over the error and value types of the `XRefM`.
 */
export function fold_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORefM<RA, RB, EC, ED, C, D> {
  return self.foldM(
    ea,
    eb,
    (c) => I.fromEither(() => ca(c)),
    (b) => I.fromEither(() => bd(b))
  )
}

/**
 * Folds over the error and value types of the `XRefM`.
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EC, ED, C, D> {
  return (self) =>
    self.foldM(
      ea,
      eb,
      (c) => I.fromEither(() => ca(c)),
      (b) => I.fromEither(() => bd(b))
    )
}

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): IORefM<RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldM(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA & RC, RB & RD, EC, ED, C, D> {
  return (self) => self.foldM(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export function foldAllM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): IORefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldAllM(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export function foldAllM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return (self) => self.foldAllM(ea, eb, ec, ca, bd)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): IORefM<RA, RB & RC, EA, EB | EC, A, C> {
  return pipe(self, dimapM(I.pure, f))
}

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM<B, RC, EC, C>(
  f: (b: B) => I.IO<RC, EC, C>
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB & RC, EA, EC | EB, A, C> {
  return (self) => mapM_(self, f)
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(self: IORefM<RA, RB, EA, EB, A, B>, f: (b: B) => C) {
  return mapM_(self, (b) => I.pure(f(b)))
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map<B, C>(
  f: (b: B) => C
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, EB, A, C> {
  return (self) => map_(self, f)
}

/*
 * -------------------------------------------
 * Tap
 * -------------------------------------------
 */

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, any>
): IORefM<RA & RC, RB, EA | EC, EB, A1, B> {
  return pipe(
    self,
    contramapM((c: A1) =>
      pipe(
        f(c),
        I.as(() => c)
      )
    )
  )
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA & RC, RB, EC | EA, EB, A1, B> {
  return (self) => tapInput_(self, f)
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapOutput_<RA, RB, EA, EB, A, B, RC, EC>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, any>
): IORefM<RA, RB & RC, EA, EB | EC, A, B> {
  return pipe(
    self,
    mapM((b) =>
      pipe(
        f(b),
        I.as(() => b)
      )
    )
  )
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapOutput<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB & RC, EA, EC | EB, A, B> {
  return (self) => tapOutput_(self, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, EA, EB, B, RC, EC, A, RD, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): IORefM<RA & RC, RB & RD, EA | EC, EB | ED, C, D> {
  return self.foldM(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export function dimapM<B, RC, EC, A, RD, ED, C = A, D = B>(
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA & RC, RB & RD, EC | EA, ED | EB, C, D> {
  return (self) => dimapM_(self, f, g)
}

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export function dimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): IORefM<RA, RB, EC, ED, A, B> {
  return pipe(
    self,
    fold(
      (ea) => f(ea),
      (eb) => g(eb),
      (a) => E.right(a),
      (b) => E.right(b)
    )
  )
}

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export function dimapError<EA, EB, EC, ED>(
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): <RA, RB, A, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EC, ED, A, B> {
  return (self) => dimapError_(self, f, g)
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify_<RA, RB, EA, EB, R1, E1, B, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    self,
    concrete,
    matchTag({
      Atomic: (atomic) =>
        pipe(
          atomic.ref.get,
          I.flatMap(f),
          I.flatMap(([b, a]) =>
            pipe(
              atomic.ref.set(a),
              I.as(() => b)
            )
          ),
          S.withPermit(atomic.semaphore)
        ),
      Derived: (derived) =>
        pipe(
          derived.value.ref.get,
          I.flatMap((a) =>
            pipe(
              derived.getEither(a),
              I.flatMap(f),
              I.flatMap(([b, a]) =>
                pipe(
                  derived.setEither(a),
                  I.flatMap((a) => derived.value.ref.set(a)),
                  I.as(() => b)
                )
              )
            )
          ),
          S.withPermit(derived.value.semaphore)
        ),
      DerivedAll: (derivedAll) =>
        pipe(
          derivedAll.value.ref.get,
          I.flatMap((s) =>
            pipe(
              derivedAll.getEither(s),
              I.flatMap(f),
              I.flatMap(([b, a]) =>
                pipe(
                  derivedAll.setEither(a)(s),
                  I.flatMap((a) => derivedAll.value.ref.set(a)),
                  I.as(() => b)
                )
              )
            )
          ),
          S.withPermit(derivedAll.value.semaphore)
        )
    })
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify<R1, E1, B, A>(
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, B> {
  return (self) => modify_(self, f)
}

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, A>, a: A): I.IO<RA & RB, EA | EB, A> {
  return pipe(
    self,
    modify((v) => I.pure([v, a]))
  )
}

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet<A>(a: A): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB, EA | EB, A> {
  return (self) => getAndSet_(self, a)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        I.map((r) => [v, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (self) => getAndUpdate_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSome_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => I.pure(v)),
        I.map((r) => [v, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSome<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, A> {
  return (self) => getAndUpdateSome_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export function modifySome_<RA, RB, EA, EB, R1, E1, A, B>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<I.IO<R1, E1, readonly [B, A]>>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => I.pure(tuple(def, v)))
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export function modifySome<B>(
  def: B
): <R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, [B, A]>>
) => <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, B> {
  return (f) => (self) => modifySome_(self, def, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function update_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        I.map((r) => [undefined, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function update<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (self) => update_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGet_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        I.map((r) => [r, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGet<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (self) => updateAndGet_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSome_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => I.pure(v)),
        I.map((r) => [undefined, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSome<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, void> {
  return (self) => updateSome_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGet_<RA, RB, EA, EB, R1, E1, A>(
  self: IORefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => I.pure(v)),
        I.map((r) => [r, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGet<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: IORefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (self) => updateSomeAndGet_(self, f)
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<I.IO<RC, EC, C>>
): IORefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> {
  return self.foldM(
    identity,
    (_) => O.some<EB | EC>(_),
    (_) => I.pure(_),
    (b) =>
      pipe(
        f(b),
        O.map((a) => I.asSomeError(a)),
        O.getOrElse(() => I.fail(O.none()))
      )
  )
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM<B, RC, EC, C>(
  f: (b: B) => O.Option<I.IO<RC, EC, C>>
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB & RC, EA, O.Option<EC | EB>, A, C> {
  return (self) => collectM_(self, f)
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<RA, RB, EA, EB, A, B, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<C>
): IORefM<RA, RB, EA, O.Option<EB>, A, C> {
  return pipe(
    self,
    collectM((b) => pipe(f(b), O.map(I.pure)))
  )
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  f: (b: B) => O.Option<C>
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, O.Option<EB>, A, C> {
  return (self) => collect_(self, f)
}

/**
 * Returns a read only view of the `XRefM`.
 */
export function readOnly<RA, RB, EA, EB, A, B>(self: IORefM<RA, RB, EA, EB, A, B>): IORefM<RA, RB, EA, EB, never, B> {
  return self
}

/**
 * Returns a read only view of the `XRefM`.
 */
export function writeOnly<RA, RB, EA, EB, A, B>(
  self: IORefM<RA, RB, EA, EB, A, B>
): IORefM<RA, RB, EA, void, A, never> {
  return pipe(
    self,
    fold(
      identity,
      (): void => undefined,
      E.right,
      () => E.left<void>(undefined)
    )
  )
}
