import type { UIO } from './IO/core'
import type { UManaged } from './Managed/core'
import type { URef } from './Ref'
import type { Semaphore } from './Semaphore'

import * as E from './Either'
import * as I from './IO/core'
import * as M from './Managed/core'
import * as O from './Option'
import * as P from './prelude'
import * as Q from './Queue'
import * as R from './Ref'
import { withPermit } from './Semaphore'
import * as S from './Semaphore'

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
 * Unlike `IORef`, `RefM` allows performing effects within update operations,
 * at some cost to performance. Writes will semantically block other writers,
 * while multiple readers can read simultaneously.
 */
export interface RefM<RA, RB, EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `RefM`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `RefM`. For most use cases one of the more
   * specific combinators implemented in terms of `matchM` will be more
   * ergonomic but this method is extremely useful for implementing new
   * combinators.
   */
  readonly matchM: <RC, RD, EC, ED, C, D>(
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
  readonly matchAllM: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ) => RefM<RB & RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Reads the value from the `RefM`.
   */
  readonly get: I.IO<RB, EB, B>

  /**
   * Writes a new value to the `RefM`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => I.IO<RA, EA, void>
}

export class DerivedAllM<RA, RB, EA, EB, A, B> implements RefM<RA, RB, EA, EB, A, B> {
  readonly _tag = 'DerivedAll'

  constructor(
    readonly use: <X>(
      f: <S>(
        value: AtomicM<S>,
        getEither: (s: S) => I.IO<RB, EB, B>,
        setEither: (a: A) => (s: S) => I.IO<RA, EA, S>
      ) => X
    ) => X
  ) {
    this.matchM    = this.matchM.bind(this)
    this.matchAllM = this.matchAllM.bind(this)
    this.set       = this.set.bind(this)
  }

  matchM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAllM<RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            P.flow(getEither, I.matchM(P.flow(eb, I.fail), bd)),
            (a) => (s) => I.bind_(ca(a), (a) => I.mapError_(setEither(a)(s), ea))
          )
        )
    )
  }

  matchAllM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAllM<RB & RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            P.flow(getEither, I.matchM(P.flow(eb, I.fail), bd)),
            (c) => (s) =>
              I.bind_(
                I.matchM_(getEither(s), (e) => I.fail(ec(e)), ca(c)),
                (a) => I.mapError_(setEither(a)(s), ea)
              )
          )
        )
    )
  }

  get get(): I.IO<RB, EB, B> {
    return this.use((value, getEither) => I.bind_(value.get, getEither))
  }

  set(a: A): I.IO<RA, EA, void> {
    return this.use((value, _, setEither) =>
      withPermit(value.semaphore)(P.pipe(value.get, I.bind(setEither(a)), I.bind(value.set)))
    )
  }
}

export class DerivedM<RA, RB, EA, EB, A, B> implements RefM<RA, RB, EA, EB, A, B> {
  readonly _tag = 'Derived'

  constructor(
    readonly use: <X>(
      f: <S>(value: AtomicM<S>, getEither: (s: S) => I.IO<RB, EB, B>, setEither: (a: A) => I.IO<RA, EA, S>) => X
    ) => X
  ) {
    this.matchM    = this.matchM.bind(this)
    this.matchAllM = this.matchAllM.bind(this)
    this.set       = this.set.bind(this)
  }

  matchM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedM<RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            P.flow(getEither, I.matchM(P.flow(eb, I.fail), bd)),
            P.flow(ca, I.bind(P.flow(setEither, I.mapError(ea))))
          )
        )
    )
  }

  matchAllM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
    bd: (_: B) => I.IO<RD, ED, D>
  ): RefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAllM<RB & RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            P.flow(getEither, I.matchM(P.flow(eb, I.fail), bd)),
            (c) => (s) =>
              P.pipe(getEither(s), I.matchM(P.flow(ec, I.fail), ca(c)), I.bind(P.flow(setEither, I.mapError(ea))))
          )
        )
    )
  }

  get get(): I.IO<RB, EB, B> {
    return this.use((value, getEither) => I.bind_(value.get, getEither))
  }

  set(a: A): I.IO<RA, EA, void> {
    return this.use((value, _, setEither) => withPermit(value.semaphore)(I.bind_(setEither(a), value.set)))
  }
}

export class AtomicM<A> implements RefM<unknown, unknown, never, never, A, A> {
  readonly _tag = 'Atomic'

  constructor(readonly ref: URef<A>, readonly semaphore: Semaphore) {
    this.matchM    = this.matchM.bind(this)
    this.matchAllM = this.matchAllM.bind(this)
    this.set       = this.set.bind(this)
  }

  matchM<RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): RefM<RC, RD, EC, ED, C, D> {
    return new DerivedM<RC, RD, EC, ED, C, D>((f) => f(this, bd, ca))
  }

  matchAllM<RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => I.IO<RC, EC, A>,
    bd: (_: A) => I.IO<RD, ED, D>
  ): RefM<RC, RD, EC, ED, C, D> {
    return new DerivedAllM<RC, RD, EC, ED, C, D>((f) => f(this, bd, ca))
  }

  get get(): I.IO<unknown, never, A> {
    return this.ref.get
  }

  set(a: A): I.IO<unknown, never, void> {
    return withPermit(this.semaphore)(this.set(a))
  }
}

export interface RFRefM<R, E, A> extends RefM<R, R, E, E, A, A> {}
export interface FRefM<E, A> extends RefM<unknown, unknown, E, E, A, A> {}
export interface URRefM<R, A> extends RefM<R, R, never, never, A, A> {}
export interface URefM<A> extends RefM<unknown, unknown, never, never, A, A> {}

export function concrete<RA, RB, EA, EB, A>(_: RefM<RA, RB, EA, EB, A, A>) {
  return _ as AtomicM<A> | DerivedM<RA, RB, EA, EB, A, A> | DerivedAllM<RA, RB, EA, EB, A, A>
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
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
  return P.pipe(makeRefM(a), M.fromEffect)
}

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export function dequeueRefM<A>(a: A): UIO<readonly [URefM<A>, Q.Dequeue<A>]> {
  return I.gen(function* (_) {
    const ref   = yield* _(makeRefM(a))
    const queue = yield* _(Q.makeUnbounded<A>())
    return P.tuple(
      P.pipe(
        ref,
        tapInput((a) => queue.offer(a))
      ),
      queue
    )
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the `set` value of the `RefM` with the specified effectual
 * function.
 */
export function contramapM_<RA, RB, EA, EB, B, A, RC, EC, C>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): RefM<RA & RC, RB, EC | EA, EB, C, B> {
  return dimapM_(ref, f, I.pure)
}

/**
 * Transforms the `set` value of the `RefM` with the specified effectual
 * function.
 */
export function contramapM<A, RC, EC, C>(
  f: (c: C) => I.IO<RC, EC, A>
): <RA, RB, EA, EB, B>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB, EC | EA, EB, C, B> {
  return (ref) => contramapM_(ref, f)
}

/**
 * Transforms the `set` value of the `RefM` with the specified function.
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): RefM<RA, RB, EA, EB, C, B> {
  return contramapM_(ref, (c) => I.pure(f(c)))
}

/**
 * Transforms the `set` value of the `RefM` with the specified function.
 */
export function contramap<C, A>(
  f: (c: C) => A
): <RA, RB, EA, EB, B>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB, EA, EB, C, B> {
  return (ref) => contramap_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
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
  return P.pipe(
    ref,
    matchM(
      (ea) => O.some<EA | EC>(ea),
      P.identity,
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
 * Filters the `set` value of the `RefM` with the specified effectual
 * predicate, returning a `RefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, B>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB, O.Option<EA | EC>, EB, A1, B> {
  return (ref) => filterInputM_(ref, f)
}

/**
 * Filters the `set` value of the `RefM` with the specified effectual
 * predicate, returning a `RefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A = A>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => boolean
): RefM<RA, RB, O.Option<EA>, EB, A1, B> {
  return filterInputM_(ref, (a) => I.pure(f(a)))
}

/**
 * Filters the `set` value of the `RefM` with the specified effectual
 * predicate, returning a `RefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A = A>(
  f: (a: A1) => boolean
): <RA, RB, EA, EB, B>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB, O.Option<EA>, EB, A1, B> {
  return (ref) => filterInput_(ref, f)
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
  return matchM_(
    ref,
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
 * Filters the `get` value of the `RefM` with the specified effectual predicate,
 * returning a `RefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB & RC, EA, O.Option<EB | EC>, A, B> {
  return (ref) => filterOutputM_(ref, f)
}

/**
 * Filters the `get` value of the `RefM` with the specified predicate,
 * returning a `RefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): RefM<RA, RB, EA, O.Option<EB>, A, B> {
  return filterOutputM_(ref, (b) => I.pure(f(b)))
}

/**
 * Filters the `get` value of the `RefM` with the specified predicate,
 * returning a `RefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (b: B) => boolean
): <RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB, EA, O.Option<EB>, A, B> {
  return (ref) => filterOutput_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Folds over the error and value types of the `RefM`.
 */
export function match_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): RefM<RA, RB, EC, ED, C, D> {
  return ref.matchM(
    ea,
    eb,
    (c) => I.fromEither(() => ca(c)),
    (b) => I.fromEither(() => bd(b))
  )
}

/**
 * Folds over the error and value types of the `RefM`.
 */
export function match<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB, EC, ED, C, D> {
  return (ref) => match_(ref, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `RefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `RefM`. For most use cases one of the more
 * specific combinators implemented in terms of `matchM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function matchM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): RefM<RA & RC, RB & RD, EC, ED, C, D> {
  return ref.matchM(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `RefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `RefM`. For most use cases one of the more
 * specific combinators implemented in terms of `matchM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function matchM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA & RC, RB & RD, EC, ED, C, D> {
  return (ref) => matchM_(ref, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `RefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `matchM` but requires unifying the environment and error types.
 */
export function matchAllM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): RefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return ref.matchAllM(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `RefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `matchM` but requires unifying the environment and error types.
 */
export function matchAllM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return (ref) => matchAllM_(ref, ea, eb, ec, ca, bd)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Transforms the `get` value of the `RefM` with the specified effectual
 * function.
 */
export function mapM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): RefM<RA, RB & RC, EA, EB | EC, A, C> {
  return P.pipe(ref, dimapM(I.succeed, f))
}

/**
 * Transforms the `get` value of the `RefM` with the specified effectual
 * function.
 */
export function mapM<B, RC, EC, C>(
  f: (b: B) => I.IO<RC, EC, C>
): <RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB & RC, EA, EC | EB, A, C> {
  return (ref) => mapM_(ref, f)
}

/**
 * Transforms the `get` value of the `RefM` with the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): RefM<RA, RB, EA, EB, A, C> {
  return mapM_(ref, (b) => I.succeed(f(b)))
}

/**
 * Transforms the `get` value of the `RefM` with the specified function.
 */
export function map<B, C>(
  f: (b: B) => C
): <RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB, EA, EB, A, C> {
  return (ref) => map_(ref, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Tap
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Performs the specified effect every time a value is written to this
 * `RefM`.
 */
export function tapInput_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, any>
): RefM<RA & RC, RB, EA | EC, EB, A1, B> {
  return P.pipe(
    ref,
    contramapM((c: A1) =>
      P.pipe(
        f(c),
        I.as(() => c)
      )
    )
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
  return P.pipe(
    ref,
    mapM((b) =>
      P.pipe(
        f(b),
        I.as(() => b)
      )
    )
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
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
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
  return ref.matchM(
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
 * Transforms both the `set` and `get` errors of the `RefM` with the
 * specified functions.
 */
export function dimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): RefM<RA, RB, EC, ED, A, B> {
  return P.pipe(
    ref,
    match(
      (ea) => f(ea),
      (eb) => g(eb),
      (a) => E.right(a),
      (b) => E.right(b)
    )
  )
}

/**
 * Transforms both the `set` and `get` errors of the `RefM` with the
 * specified functions.
 */
export function dimapError<EA, EB, EC, ED>(
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): <RA, RB, A, B>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB, EC, ED, A, B> {
  return (ref) => dimapError_(ref, f, g)
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
  return P.pipe(
    ref,
    concrete,
    P.matchTag({
      Atomic: (atomic) =>
        P.pipe(
          atomic.ref.get,
          I.bind(f),
          I.bind(([b, a]) =>
            P.pipe(
              atomic.ref.set(a),
              I.as(() => b)
            )
          ),
          S.withPermit(atomic.semaphore)
        ),
      Derived: (derived) =>
        derived.use((value, getEither, setEither) =>
          P.pipe(
            value.ref.get,
            I.bind((a) =>
              P.pipe(
                getEither(a),
                I.bind(f),
                I.bind(([b, a]) =>
                  P.pipe(
                    setEither(a),
                    I.bind((a) => value.ref.set(a)),
                    I.as(() => b)
                  )
                )
              )
            ),
            S.withPermit(value.semaphore)
          )
        ),
      DerivedAll: (derivedAll) =>
        derivedAll.use((value, getEither, setEither) =>
          P.pipe(
            value.ref.get,
            I.bind((s) =>
              P.pipe(
                getEither(s),
                I.bind(f),
                I.bind(([b, a]) =>
                  P.pipe(
                    setEither(a)(s),
                    I.bind((a) => value.ref.set(a)),
                    I.as(() => b)
                  )
                )
              )
            ),
            S.withPermit(value.semaphore)
          )
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
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, A>, a: A): I.IO<RA & RB, EA | EB, A> {
  return P.pipe(
    ref,
    modifyM((v) => I.pure([v, a]))
  )
}

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet<A>(a: A): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB, EA | EB, A> {
  return (ref) => getAndSet_(ref, a)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => I.IO<R1, E1, A>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return P.pipe(
    ref,
    modifyM((v) =>
      P.pipe(
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
export function getAndUpdateM<R1, E1, A>(
  f: (a: A) => I.IO<R1, E1, A>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (ref) => getAndUpdate_(ref, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSomeM_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, EA | EB | E1, A> {
  return P.pipe(
    ref,
    modifyM((v) =>
      P.pipe(
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
export function getAndUpdateSomeM<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, A> {
  return (ref) => getAndUpdateSomeM_(ref, f)
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
  return P.pipe(
    ref,
    modifyM((v) =>
      P.pipe(
        f(v),
        O.getOrElse(() => I.pure(P.tuple(def, v)))
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
  return P.pipe(
    ref,
    modifyM((v) =>
      P.pipe(
        f(v),
        I.map((r) => [undefined, r])
      )
    )
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
  return P.pipe(
    ref,
    modifyM((v) =>
      P.pipe(
        f(v),
        I.map((r) => [r, r])
      )
    ),
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
  return P.pipe(
    ref,
    modifyM((v) =>
      P.pipe(
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
export function updateSomeM<R1, E1, A>(
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, EA | EB | E1, void> {
  return (ref) => updateSomeM_(ref, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGetM_<RA, RB, EA, EB, R1, E1, A>(
  ref: RefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<I.IO<R1, E1, A>>
): I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return P.pipe(
    ref,
    modifyM((v) =>
      P.pipe(
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
): <RA, RB, EA, EB>(ref: RefM<RA, RB, EA, EB, A, A>) => I.IO<RA & RB & R1, E1 | EA | EB, A> {
  return (ref) => updateSomeAndGetM_(ref, f)
}

/**
 * Maps and filters the `get` value of the `RefM` with the specified
 * effectual partial function, returning a `RefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<I.IO<RC, EC, C>>
): RefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> {
  return ref.matchM(
    P.identity,
    (_) => O.some<EB | EC>(_),
    (_) => I.pure(_),
    (b) =>
      P.pipe(
        f(b),
        O.map((a) => I.asSomeError(a)),
        O.getOrElse(() => I.fail(O.none()))
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
): <RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB & RC, EA, O.Option<EC | EB>, A, C> {
  return (ref) => collectM_(ref, f)
}

/**
 * Maps and filters the `get` value of the `RefM` with the specified partial
 * function, returning a `RefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<RA, RB, EA, EB, A, B, C>(
  ref: RefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<C>
): RefM<RA, RB, EA, O.Option<EB>, A, C> {
  return P.pipe(
    ref,
    collectM((b) => P.pipe(f(b), O.map(I.pure)))
  )
}

/**
 * Maps and filters the `get` value of the `RefM` with the specified partial
 * function, returning a `RefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  f: (b: B) => O.Option<C>
): <RA, RB, EA, EB, A>(ref: RefM<RA, RB, EA, EB, A, B>) => RefM<RA, RB, EA, O.Option<EB>, A, C> {
  return (ref) => collect_(ref, f)
}

/**
 * Returns a read only view of the `RefM`.
 */
export function readOnly<RA, RB, EA, EB, A, B>(ref: RefM<RA, RB, EA, EB, A, B>): RefM<RA, RB, EA, EB, never, B> {
  return ref
}

/**
 * Returns a read only view of the `RefM`.
 */
export function writeOnly<RA, RB, EA, EB, A, B>(ref: RefM<RA, RB, EA, EB, A, B>): RefM<RA, RB, EA, void, A, never> {
  return P.pipe(
    ref,
    match(
      P.identity,
      (): void => undefined,
      E.right,
      () => E.left<void>(undefined)
    )
  )
}
