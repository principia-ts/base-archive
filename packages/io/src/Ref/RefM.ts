import type { UIO } from '../IO/core'
import type { UManaged } from '../Managed/core'
import type { Semaphore } from '../Semaphore'
import type { Ref, URef } from './core'
import type * as E from '@principia/base/Either'

import { flow, identity, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { tuple } from '@principia/base/tuple'
import { matchTag } from '@principia/base/util/matchers'

import * as I from '../IO/core'
import * as M from '../Managed/core'
import * as Q from '../Queue'
import { withPermit } from '../Semaphore'
import * as S from '../Semaphore'
import * as R from './core'

/*
 * -------------------------------------------
 * RefM
 * -------------------------------------------
 */

/**
 * An `RefM<RA, RB, EA, EB, A, B>` is a polymorphic, purely functional
 * description of a mutable reference. The fundamental operations of a `RefM`
 * are `set` and `get`. `set` takes a value of type `A` and sets the reference
 * to a new value, requiring an environment of type `RA` and potentially
 * failing with an error of type `EA`. `get` gets the current value of the
 * reference and returns a value of type `B`, requiring an environment of type
 * `RB` and potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `RefM` are unified, that is, it is a
 * `RefM<RA, RB, E, E, A, A>`, the `RefM` also supports atomic `modify` and `update`
 * operations.
 *
 * Unlike `Ref`, `RefM` allows performing effects within update operations,
 * at some cost to performance. Writes will semantically block other writers,
 * while multiple readers can read simultaneously.
 */
export abstract class RefM<RA, RB, EA, EB, A, B> implements Ref<RA, RB, EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `RefM`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `RefM`. For most use cases one of the more
   * specific combinators implemented in terms of `matchM` will be more
   * ergonomic but this method is extremely useful for implementing new
   * combinators.
   */
  abstract readonly foldM: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ) => RefM<RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Folds over the error and value types of the `RefM`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `matchM` but requires unifying the environment and error types.
   */
  abstract readonly foldAllM: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ) => RefM<RB & RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Reads the value from the `RefM`.
   */
  abstract readonly get: I.IO<RB, EB, B>

  /**
   * Writes a new value to the `RefM`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  abstract readonly set: (a: A) => I.IO<RA, EA, void>

  readonly fold = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): RefM<RA, RB, EC, ED, C, D> =>
    this.foldM(
      ea,
      eb,
      (c) => I.fromEither(() => ca(c)),
      (b) => I.fromEither(() => bd(b))
    )

  readonly foldAll = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): Ref<RA & RB, RB, EC, ED, C, D> =>
    this.foldAllM(
      ea,
      eb,
      ec,
      (c) => (b) => I.fromEither(() => ca(c)(b)),
      (b) => I.fromEither(() => bd(b))
    )
}

export class DerivedAllM<RA, RB, EA, EB, A, B, S> extends RefM<RA, RB, EA, EB, A, B> {
  readonly _tag = 'DerivedAllM'

  constructor(
    readonly value: AtomicM<S>,
    readonly getEither: (s: S) => I.IO<RB, EB, B>,
    readonly setEither: (a: A) => (s: S) => I.IO<RA, EA, S>
  ) {
    super()
  }

  readonly foldM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAllM<RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      flow(this.getEither, I.matchM(flow(eb, I.fail), bd)),
      (a) => (s) =>
        pipe(
          ca(a),
          I.bind((a) => pipe(this.setEither(a)(s), I.mapError(ea)))
        )
    )

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RB & RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAllM<RB & RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      flow(this.getEither, I.matchM(flow(eb, I.fail), bd)),
      (c) => (s) =>
        pipe(
          this.getEither(s),
          I.matchM(flow(ec, I.fail), ca(c)),
          I.bind((a) => pipe(this.setEither(a)(s), I.mapError(ea)))
        )
    )

  get: I.IO<RB, EB, B> = I.bind_(this.value.get, this.getEither)

  set: (a: A) => I.IO<RA, EA, void> = (a) =>
    withPermit(this.value.semaphore)(pipe(this.value.get, I.bind(this.setEither(a)), I.bind(this.value.set)))
}

export class DerivedM<RA, RB, EA, EB, A, B, S> extends RefM<RA, RB, EA, EB, A, B> {
  readonly _tag = 'DerivedM'

  constructor(
    readonly value: AtomicM<S>,
    readonly getEither: (s: S) => I.IO<RB, EB, B>,
    readonly setEither: (a: A) => I.IO<RA, EA, S>
  ) {
    super()
  }

  readonly foldM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedM<RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      flow(this.getEither, I.matchM(flow(eb, I.fail), bd)),
      flow(ca, I.bind(flow(this.setEither, I.mapError(ea))))
    )

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RB & RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAllM<RB & RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      flow(this.getEither, I.matchM(flow(eb, I.fail), bd)),
      (c) => (s) =>
        pipe(this.getEither(s), I.matchM(flow(ec, I.fail), ca(c)), I.bind(flow(this.setEither, I.mapError(ea))))
    )

  get: I.IO<RB, EB, B> = this.value.get['>>='](this.getEither)

  set: (a: A) => I.IO<RA, EA, void> = (a) => withPermit(this.value.semaphore)(this.setEither(a)['>>='](this.value.set))
}

export class AtomicM<A> extends RefM<unknown, unknown, never, never, A, A> {
  readonly _tag = 'AtomicM'

  constructor(readonly ref: URef<A>, readonly semaphore: Semaphore) {
    super()
  }

  readonly foldM = <RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): RefM<RC, RD, EC, ED, C, D> => new DerivedM<RC, RD, EC, ED, C, D, A>(this, bd, ca)

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): RefM<RC, RD, EC, ED, C, D> => new DerivedAllM<RC, RD, EC, ED, C, D, A>(this, bd, ca)

  readonly get: I.IO<unknown, never, A> = this.ref.get

  readonly set: (a: A) => I.IO<unknown, never, void> = (a) => withPermit(this.semaphore)(this.set(a))
}

export interface FRefM<E, A> extends RefM<unknown, unknown, E, E, A, A> {}
export interface URRefM<R, A> extends RefM<R, R, never, never, A, A> {}
export interface URefM<A> extends RefM<unknown, unknown, never, never, A, A> {}

const concreteM = <RA, RB, EA, EB, A>(_: RefM<RA, RB, EA, EB, A, A>) =>
  _ as AtomicM<A> | DerivedM<RA, RB, EA, EB, A, A, A> | DerivedAllM<RA, RB, EA, EB, A, A, A>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Creates a new `RefM` with the specified value.
 */
export function makeRefM<A>(a: A): UIO<URefM<A>> {
  return I.gen(function* (_) {
    const ref       = yield* _(R.makeRef(a))
    const semaphore = yield* _(S.make(1))
    return new AtomicM(ref, semaphore)
  })
}

/**
 * Creates a new `RefM` with the specified value.
 */
export function unsafeMakeRefM<A>(a: A): URefM<A> {
  const ref       = R.unsafeMakeRef(a)
  const semaphore = S.unsafeMake(1)
  return new AtomicM(ref, semaphore)
}

/**
 * Creates a new `RefM` with the specified value in the context of a
 * `Managed.`
 */
export function makeManagedRefM<A>(a: A): UManaged<URefM<A>> {
  return pipe(makeRefM(a), M.fromEffect)
}

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export function dequeueRefM<A>(a: A): UIO<readonly [URefM<A>, Q.Dequeue<A>]> {
  return I.gen(function* (_) {
    const ref   = yield* _(makeRefM(a))
    const queue = yield* _(Q.makeUnbounded<A>())
    return tuple(
      pipe(
        ref,
        tapInput((a) => queue.offer(a))
      ),
      queue
    )
  })
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

/**
 * Transforms the `set` value of the `RefM` with the specified effectual
 * function.
 */
export function contramapM_<RA, RB, EA, EB, B, A, RC, EC, C>(
  self: RefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): RefM<RA & RC, RB, EC | EA, EB, C, B> {
  return dimapM_(self, f, I.pure)
}

/**
 * Transforms the `set` value of the `RefM` with the specified effectual
 * function.
 */
export function contramapM<A, RC, EC, C>(
  f: (c: C) => I.IO<RC, EC, A>
): <RA, RB, EA, EB, B>(self: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB, EC | EA, EB, C, B> {
  return (self) => contramapM_(self, f)
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * Filters the `set` value of the `RefM` with the specified effectual
 * predicate, returning a `RefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, boolean>
): RefM<RA & RC, RB, O.Option<EC | EA>, EB, A1, B> {
  return ref.foldM(
    O.Some,
    identity,
    (a) =>
      pipe(
        f(a),
        I.asSomeError,
        I.ifM(
          () => I.succeed(a),
          () => I.fail(O.None<EA | EC>())
        )
      ),
    I.succeed
  )
}

/**
 * Filters the `set` value of the `RefM` with the specified effectual
 * predicate, returning a `RefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, B>(self: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB, O.Option<EA | EC>, EB, A1, B> {
  return (self) => filterInputM_(self, f)
}

/**
 * Filters the `get` value of the `RefM` with the specified effectual predicate,
 * returning a `RefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM_<RA, RB, EA, EB, A, B, RC, EC>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, boolean>
): RefM<RA, RB & RC, EA, O.Option<EC | EB>, A, B> {
  return ref.foldM(identity, O.Some, I.succeed, (b) =>
    pipe(
      f(b),
      I.asSomeError,
      I.ifM(
        () => I.succeed(b),
        () => I.fail(O.None<EB | EC>())
      )
    )
  )
}

/**
 * Filters the `get` value of the `RefM` with the specified effectual predicate,
 * returning a `RefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, A>(self: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB & RC, EA, O.Option<EB | EC>, A, B> {
  return (self) => filterOutputM_(self, f)
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * Folds over the error and value types of the `RefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `RefM`. For most use cases one of the more
 * specific combinators implemented in terms of `matchM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: RefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): RefM<RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldM(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `RefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `RefM`. For most use cases one of the more
 * specific combinators implemented in terms of `matchM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(self: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB & RD, EC, ED, C, D> {
  return (self) => self.foldM(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `RefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `matchM` but requires unifying the environment and error types.
 */
export function foldAllM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: RefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): RefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldAllM(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `RefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `matchM` but requires unifying the environment and error types.
 */
export function foldAllM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(self: RefM<RA, RB, EA, EB, A, B>) => RefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return (self) => self.foldAllM(ea, eb, ec, ca, bd)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Transforms the `get` value of the `RefM` with the specified effectual
 * function.
 */
export function mapM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): RefM<RA, RB & RC, EA, EB | EC, A, C> {
  return pipe(self, dimapM(I.succeed, f))
}

/**
 * Transforms the `get` value of the `RefM` with the specified effectual
 * function.
 */
export function mapM<B, RC, EC, C>(
  f: (b: B) => I.IO<RC, EC, C>
): <RA, RB, EA, EB, A>(self: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB & RC, EA, EC | EB, A, C> {
  return (self) => mapM_(self, f)
}

/*
 * -------------------------------------------
 * Tap
 * -------------------------------------------
 */

/**
 * Performs the specified effect every time a value is written to this
 * `RefM`.
 */
export function tapInput_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: RefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, any>
): RefM<RA & RC, RB, EA | EC, EB, A1, B> {
  return pipe(
    self,
    contramapM((c: A1) => f(c)['$>'](() => c))
  )
}

/**
 * Performs the specified effect every time a value is written to this
 * `RefM`.
 */
export function tapInput<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, B>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB, EC | EA, EB, A1, B> {
  return (ref) => tapInput_(ref, f)
}

/**
 * Performs the specified effect every time a value is written to this
 * `RefM`.
 */
export function tapOutput_<RA, RB, EA, EB, A, B, RC, EC>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, any>
): RefM<RA, RB & RC, EA, EB | EC, A, B> {
  return pipe(
    ref,
    mapM((b) => f(b)['$>'](() => b))
  )
}

/**
 * Performs the specified effect every time a value is written to this
 * `RefM`.
 */
export function tapOutput<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB & RC, EA, EC | EB, A, B> {
  return (ref) => tapOutput_(ref, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Transforms both the `set` and `get` values of the `RefM` with the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, EA, EB, B, RC, EC, A, RD, ED, C = A, D = B>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): RefM<RA & RC, RB & RD, EA | EC, EB | ED, C, D> {
  return ref.foldM(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `RefM` with the
 * specified effectual functions.
 */
export function dimapM<B, RC, EC, A, RD, ED, C = A, D = B>(
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB & RD, EC | EA, ED | EB, C, D> {
  return (ref) => dimapM_(ref, f, g)
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modifyM_<RA, RB, EA, EB, R1, E1, B, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    ref,
    concreteM,
    matchTag({
      AtomicM: (atomic) =>
        pipe(
          atomic.ref.get,
          I.bind(f),
          I.bind(([b, a]) =>
            pipe(
              atomic.ref.set(a),
              I.as(() => b)
            )
          ),
          S.withPermit(atomic.semaphore)
        ),
      DerivedM: (derived) =>
        pipe(
          derived.value.ref.get,
          I.bind((a) =>
            pipe(
              derived.getEither(a),
              I.bind(f),
              I.bind(([b, a]) =>
                pipe(
                  derived.setEither(a),
                  I.bind((a) => derived.value.ref.set(a)),
                  I.as(() => b)
                )
              )
            )
          ),
          S.withPermit(derived.value.semaphore)
        ),
      DerivedAllM: (derivedAll) =>
        pipe(
          derivedAll.value.ref.get,
          I.bind((s) =>
            pipe(
              derivedAll.getEither(s),
              I.bind(f),
              I.bind(([b, a]) =>
                pipe(
                  derivedAll.setEither(a)(s),
                  I.bind((a) => derivedAll.value.ref.set(a)),
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
export function modifyM<R1, E1, B, A>(
  f: (a: A) => I.IO<R1, E1, readonly [B, A]>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, B> {
  return (ref) => modifyM_(ref, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateM_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    ref,
    modifyM((v) => f(v)['<$>']((r) => [v, r]))
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateM<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (ref) => getAndUpdateM_(ref, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSomeM_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return pipe(
    ref,
    modifyM((v) =>
      pipe(
        f(v),
        O.getOrElse(() => I.succeed(v)),
        I.map((r) => [v, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSomeM<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, A> {
  return (self) => getAndUpdateSomeM_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export function modifySomeM_<RA, RB, EA, EB, R1, E1, A, B>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<I.IO<R1, E1, readonly [B, A]>>
): I.IO<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    ref,
    modifyM((v) =>
      pipe(
        f(v),
        O.getOrElse(() => I.succeed(tuple(def, v)))
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
export function modifySomeM<B>(
  def: B
): <R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, [B, A]>>
) => <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, B> {
  return (f) => (ref) => modifySomeM_(ref, def, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateM_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    ref,
    modifyM((v) => f(v)['<$>']((r) => [undefined, r]))
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateM<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (ref) => updateM_(ref, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGetM_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    ref,
    modifyM((v) => f(v)['<$>']((r) => [r, r])),
    I.asUnit
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGetM<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return (ref) => updateAndGetM_(ref, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeM_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, void> {
  return pipe(
    ref,
    modifyM((v) =>
      pipe(
        f(v),
        O.getOrElse(() => I.succeed(v)),
        I.map((r) => [undefined, r])
      )
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeM<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, void> {
  return (self) => updateSomeM_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGetM_<RA, RB, EA, EB, R1, E1, A>(
  self: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return pipe(
    self,
    modifyM((v) =>
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
export function updateSomeAndGetM<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(self: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (self) => updateSomeAndGetM_(self, f)
}

/**
 * Maps and filters the `get` value of the `RefM` with the specified
 * effectual partial function, returning a `RefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<I.IO<RC, EC, C>>
): RefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> {
  return self.foldM(
    identity,
    (_) => O.Some<EB | EC>(_),
    (_) => I.pure(_),
    (b) =>
      pipe(
        f(b),
        O.map((a) => I.asSomeError(a)),
        O.getOrElse(() => I.fail(O.None()))
      )
  )
}

/**
 * Maps and filters the `get` value of the `RefM` with the specified
 * effectual partial function, returning a `RefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM<B, RC, EC, C>(
  f: (b: B) => O.Option<I.IO<RC, EC, C>>
): <RA, RB, EA, EB, A>(self: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB & RC, EA, O.Option<EC | EB>, A, C> {
  return (self) => collectM_(self, f)
}
