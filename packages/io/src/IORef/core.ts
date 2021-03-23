import type { FIO, IO, UIO } from '../IO/core'
import type { AtomicM, DerivedAllM, DerivedM, IORefM } from './IORefM'

import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { tuple } from '@principia/base/tuple'
import { matchTag } from '@principia/base/util/matchers'
import { AtomicReference } from '@principia/base/util/support/AtomicReference'

import * as I from '../IO/core'
import { withPermit } from '../Semaphore'
import * as At from './atomic'

export interface IORef<RA, RB, EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `IORef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `IORef`. For most use cases one of the more specific
   * combinators implemented in terms of `match` will be more ergonomic but this
   * method is extremely useful for implementing new combinators.
   */
  readonly fold: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => IORef<RA, RB, EC, ED, C, D>

  /**
   * Folds over the error and value types ofthe `IORef`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `match` but requires unifying the error types.
   */
  readonly foldAll: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => IORef<RA & RB, RB, EC, ED, C, D>

  /**
   * Reads the value from the `IORef`.
   */
  readonly get: IO<RB, EB, B>

  /**
   * Writes a new value to the `IORef`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => IO<RA, EA, void>
}

export class DerivedAll<EA, EB, A, B, S> implements IORef<unknown, unknown, EA, EB, A, B> {
  readonly _tag = 'DerivedAll'

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => (s: S) => E.Either<EA, S>
  ) {}

  readonly fold = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): IORef<unknown, unknown, EC, ED, C, D> =>
    new DerivedAll(
      this.value,
      (s) => E.match_(this.getEither(s), (e) => E.Left(eb(e)), bd),
      (c) => (s) => E.bind_(ca(c), (a) => E.match_(this.setEither(a)(s), (e) => E.Left(ea(e)), E.Right))
    )

  readonly foldAll = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): IORef<unknown, unknown, EC, ED, C, D> =>
    new DerivedAll(
      this.value,
      (s) => E.match_(this.getEither(s), (e) => E.Left(eb(e)), bd),
      (c) => (s) =>
        pipe(
          this.getEither(s),
          E.match((e) => E.Left(ec(e)), ca(c)),
          E.deunion,
          E.bind((a) => E.match_(this.setEither(a)(s), (e) => E.Left(ea(e)), E.Right))
        )
    )

  readonly get: FIO<EB, B> = pipe(
    this.value.get,
    I.bind((a) => E.match_(this.getEither(a), I.fail, I.pure))
  )

  readonly set: (a: A) => IO<unknown, EA, void> = (a) =>
    pipe(
      this.value,
      modify((s) =>
        E.match_(
          this.setEither(a)(s),
          (e) => [E.Left(e), s] as [E.Either<EA, void>, S],
          (s) => [E.Right(undefined), s] as [E.Either<EA, void>, S]
        )
      ),
      I.refail
    )
}

export class Derived<EA, EB, A, B, S> implements IORef<unknown, unknown, EA, EB, A, B> {
  readonly _tag = 'Derived'

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => E.Either<EA, S>
  ) {}

  readonly fold = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): IORef<unknown, unknown, EC, ED, C, D> =>
    new Derived<EC, ED, C, D, S>(
      this.value,
      (s) => E.match_(this.getEither(s), (e) => E.Left(eb(e)), bd),
      (c) => E.bind_(ca(c), (a) => E.match_(this.setEither(a), (e) => E.Left(ea(e)), E.Right))
    )

  readonly foldAll = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): IORef<unknown, unknown, EC, ED, C, D> =>
    new DerivedAll<EC, ED, C, D, S>(this.value, flow(this.getEither, E.match(flow(eb, E.Left), bd)), (c) =>
      flow(
        this.getEither,
        E.match(flow(ec, E.Left), ca(c)),
        E.bind(flow(this.setEither, E.match(flow(ea, E.Left), E.Right)))
      )
    )

  readonly get: FIO<EB, B> = pipe(this.value.get, I.bind(flow(this.getEither, E.match(I.fail, I.succeed))))

  readonly set: (a: A) => FIO<EA, void> = flow(this.setEither, E.match(I.fail, this.value.set))
}

export class Atomic<A> implements IORef<unknown, unknown, never, never, A, A> {
  readonly _tag = 'Atomic'

  readonly fold = <EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): IORef<unknown, unknown, EC, ED, C, D> =>
    new Derived<EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (c) => ca(c)
    )

  readonly foldAll = <EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): IORef<unknown, unknown, EC, ED, C, D> =>
    new DerivedAll<EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (c) => (s) => ca(c)(s)
    )

  constructor(readonly value: AtomicReference<A>) {}

  get get(): UIO<A> {
    return I.effectTotal(() => this.value.get)
  }

  readonly set = (a: A): UIO<void> => {
    return I.effectTotal(() => {
      this.value.set(a)
    })
  }
}

/**
 * A Ref that can fail with error E
 */
export interface FRef<E, A> extends IORef<unknown, unknown, E, E, A, A> {}

/**
 * A Ref that cannot fail
 */
export interface URef<A> extends FRef<never, A> {}

/**
 * Cast to a sealed union in case of ERef (where it make sense)
 */
export const concrete = <RA, RB, EA, EB, A>(self: IORef<RA, RB, EA, EB, A, A>) =>
  self as
    | Atomic<A>
    | DerivedAll<EA, EB, A, A, A>
    | Derived<EA, EB, A, A, A>
    | AtomicM<A>
    | DerivedAllM<RA, RB, EA, EB, A, A, A>
    | DerivedM<RA, RB, EA, EB, A, A, A>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Creates a new `XRef` with the specified value.
 */
export function make<A>(a: A): UIO<URef<A>> {
  return I.effectTotal(() => new Atomic(new AtomicReference(a)))
}

/**
 * Creates a new `XRef` with the specified value.
 */
export function unsafeMake<A>(a: A): URef<A> {
  return new Atomic(new AtomicReference(a))
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export function contramapEither_<RA, RB, A, EC, C, EA, EB, B>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>
): IORef<RA, RB, EC | EA, EB, C, B> {
  return dimapEither_(ref, f, E.Right)
}

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export function contramapEither<A, EC, C>(
  f: (_: C) => E.Either<EC, A>
): <RA, RB, EA, EB, B>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA | EC, EB, C, B> {
  return (ref) => contramapEither_(ref, f)
}

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap: <A, C>(
  f: (_: C) => A
) => <RA, RB, EA, EB, B>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, EB, C, B> = (f) =>
  contramapEither((c) => E.Right(f(c)))

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap_: <RA, RB, EA, EB, B, A, C>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: C) => A
) => IORef<RA, RB, EA, EB, C, B> = (_, f) => contramap(f)(_)

/*
 * -------------------------------------------
 * Filter
 * -------------------------------------------
 */

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: A1) => boolean
): IORef<RA, RB, O.Option<EA>, EB, A1, B> {
  return ref.fold(O.Some, identity, (a) => (f(a) ? E.Right(a) : E.Left(O.None())), E.Right)
}

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A>(
  f: (_: A1) => boolean
): <RA, RB, EA, EB, B>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, O.Option<EA>, EB, A1, B> {
  return (_) => filterInput_(_, f)
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: B) => boolean
): IORef<RA, RB, EA, O.Option<EB>, A, B> {
  return ref.fold(identity, O.Some, E.Right, (b) => (f(b) ? E.Right(b) : E.Left(O.None())))
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (_: B) => boolean
): <RA, RB, EA, EB, A>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, O.Option<EB>, A, B> {
  return (_) => filterOutput_(_, f)
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `match` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORefM<RA, RB, EC, ED, C, D>
export function fold_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<RA, RB, EC, ED, C, D>
export function fold_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<RA, RB, EC, ED, C, D> {
  return ref.fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `match` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EC, ED, C, D>
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EC, ED, C, D>
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EC, ED, C, D> {
  return (ref) => fold_(ref, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `match` but requires unifying the error types.
 */
export function foldAll_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORefM<RA & RB, RB, EC, ED, C, D>
export function foldAll_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<RA & RB, RB, EC, ED, C, D>
export function foldAll_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<RA & RB, RB, EC, ED, C, D> {
  return ref.foldAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `match` but requires unifying the error types.
 */
export function foldAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA & RB, RB, EC, ED, C, D>
export function foldAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA & RB, RB, EC, ED, C, D>
export function foldAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): <RA, RB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA & RB, RB, EC, ED, C, D> {
  return (ref) => foldAll_(ref, ea, eb, ec, ca, bd)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export function mapEither_<RA, RB, EA, EB, A, B, EC, C>(
  ref: IORefM<RA, RB, EA, EB, A, B>,
  f: (_: B) => E.Either<EC, C>
): IORefM<RA, RB, EA, EC | EB, A, C>
export function mapEither_<RA, RB, EA, EB, A, B, EC, C>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: B) => E.Either<EC, C>
): IORef<RA, RB, EA, EC | EB, A, C>
export function mapEither_<RA, RB, EA, EB, A, B, EC, C>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: B) => E.Either<EC, C>
): IORef<RA, RB, EA, EC | EB, A, C> {
  return dimapEither_(ref, (a) => E.Right(a), f)
}

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export function mapEither<B, EC, C>(
  f: (_: B) => E.Either<EC, C>
): <RA, RB, EA, EB, A>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, EC | EB, A, C>
export function mapEither<B, EC, C>(
  f: (_: B) => E.Either<EC, C>
): <RA, RB, EA, EB, A>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, EC | EB, A, C>
export function mapEither<B, EC, C>(
  f: (_: B) => E.Either<EC, C>
): <RA, RB, EA, EB, A>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, EC | EB, A, C> {
  return (ref) => mapEither_(ref, f)
}

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  ref: IORefM<RA, RB, EA, EB, A, B>,
  f: (_: B) => C
): IORefM<RA, RB, EA, EB, A, C>
export function map_<RA, RB, EA, EB, A, B, C>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: B) => C
): IORef<RA, RB, EA, EB, A, C>
export function map_<RA, RB, EA, EB, A, B, C>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: B) => C
): IORef<RA, RB, EA, EB, A, C> {
  return mapEither_(ref, (b) => E.Right(f(b)))
}

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export function map<B, C>(
  f: (_: B) => C
): <RA, RB, EA, EB, A>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, EB, A, C>
export function map<B, C>(
  f: (_: B) => C
): <RA, RB, EA, EB, A>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, EB, A, C>
export function map<B, C>(
  f: (_: B) => C
): <RA, RB, EA, EB, A>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, EB, A, C> {
  return (ref) => map_(ref, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Maps and filters the `get` value of the `IORef` with the specified partial
 * function, returning a `IORef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<X, RA, RB, EA, EB, A, B, C>(
  ref: IORefM<RA, RB, EA, EB, A, B> & X,
  pf: (_: B) => O.Option<C>
): IORefM<RA, RB, EA, O.Option<EB>, A, C>
export function collect_<X, RA, RB, EA, EB, A, B, C>(
  ref: IORef<RA, RB, EA, EB, A, B> & X,
  pf: (_: B) => O.Option<C>
): IORef<RA, RB, EA, O.Option<EB>, A, C>
export function collect_<X, RA, RB, EA, EB, A, B, C>(
  ref: IORef<RA, RB, EA, EB, A, B> & X,
  pf: (_: B) => O.Option<C>
): IORef<RA, RB, EA, O.Option<EB>, A, C> {
  return ref.fold(identity, O.Some, E.Right, (b) => E.fromOption_(pf(b), () => O.None()))
}

/**
 * Maps and filters the `get` value of the `IORef` with the specified partial
 * function, returning a `IORef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  pf: (_: B) => O.Option<C>
): <RA, RB, EA, EB, A>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, O.Option<EB>, A, C>
export function collect<B, C>(
  pf: (_: B) => O.Option<C>
): <RA, RB, EA, EB, A>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, O.Option<EB>, A, C>
export function collect<B, C>(
  pf: (_: B) => O.Option<C>
): <RA, RB, EA, EB, A>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, O.Option<EB>, A, C> {
  return (ref) => collect_(ref, pf)
}

/**
 * Transforms both the `set` and `get` values of the `IORef` with the
 * specified fallible functions.
 */
export function dimapEither_<RA, RB, EA, EB, A, B, C, EC, D, ED, X>(
  ref: IORefM<RA, RB, EA, EB, A, B> & X,
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): IORefM<RA, RB, EC | EA, ED | EB, C, D>
export function dimapEither_<RA, RB, EA, EB, A, B, C, EC, D, ED, X>(
  ref: IORef<RA, RB, EA, EB, A, B> & X,
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): IORef<RA, RB, EC | EA, ED | EB, C, D>
export function dimapEither_<RA, RB, EA, EB, A, B, C, EC, D, ED, X>(
  ref: IORef<RA, RB, EA, EB, A, B> & X,
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): IORef<RA, RB, EC | EA, ED | EB, C, D> {
  return ref.fold(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `IORef` with the
 * specified fallible functions.
 */
export function dimapEither<A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): <RA, RB, EA, EB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EC | EA, ED | EB, C, D>
export function dimapEither<A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EC | EA, ED | EB, C, D>
export function dimapEither<A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): <RA, RB, EA, EB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EC | EA, ED | EB, C, D> {
  return (ref) => dimapEither_(ref, f, g)
}

/**
 * Transforms both the `set` and `get` values of the `IORef` with the
 * specified functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  ref: IORefM<RA, RB, EA, EB, A, B>,
  f: (_: C) => A,
  g: (_: B) => D
): IORefM<RA, RB, EA, EB, C, D>
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: C) => A,
  g: (_: B) => D
): IORef<RA, RB, EA, EB, C, D>
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: C) => A,
  g: (_: B) => D
): IORef<RA, RB, EA, EB, C, D> {
  return dimapEither_(
    ref,
    (c) => E.Right(f(c)),
    (b) => E.Right(g(b))
  )
}

/**
 * Transforms both the `set` and `get` values of the `IORef` with the
 * specified functions.
 */
export function dimap<A, B, C, D>(
  f: (_: C) => A,
  g: (_: B) => D
): <RA, RB, EA, EB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, EB, C, D>
export function dimap<A, B, C, D>(
  f: (_: C) => A,
  g: (_: B) => D
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, EB, C, D>
export function dimap<A, B, C, D>(
  f: (_: C) => A,
  g: (_: B) => D
): <RA, RB, EA, EB>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EA, EB, C, D> {
  return (ref) => dimap_(ref, f, g)
}

/**
 * Transforms both the `set` and `get` errors of the `IORef` with the
 * specified functions.
 */
export function dimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  ref: IORefM<RA, RB, EA, EB, A, B>,
  f: (_: EA) => EC,
  g: (_: EB) => ED
): IORefM<RA, RB, EC, ED, A, B>
export function dimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: EA) => EC,
  g: (_: EB) => ED
): IORef<RA, RB, EC, ED, A, B>
export function dimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  ref: IORef<RA, RB, EA, EB, A, B>,
  f: (_: EA) => EC,
  g: (_: EB) => ED
): IORef<RA, RB, EC, ED, A, B> {
  return ref.fold(f, g, E.Right, E.Right)
}

/**
 * Transforms both the `set` and `get` errors of the `IORef` with the
 * specified functions.
 */
export function dimapError<EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
): <RA, RB, A, B>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EC, ED, A, B>
export function dimapError<EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
): <RA, RB, A, B>(ref: IORef<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EC, ED, A, B>
export function dimapError<EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
): <RA, RB, A, B>(ref: IORefM<RA, RB, EA, EB, A, B>) => IORef<RA, RB, EC, ED, A, B> {
  return (ref) => dimapError_(ref, f, g)
}

/**
 * Returns a read only view of the `IORef`.
 */
export function readOnly<RA, RB, EA, EB, A, B>(ref: IORefM<RA, RB, EA, EB, A, B>): IORefM<RA, RB, EA, EB, never, B>
export function readOnly<RA, RB, EA, EB, A, B>(ref: IORef<RA, RB, EA, EB, A, B>): IORef<RA, RB, EA, EB, never, B>
export function readOnly<RA, RB, EA, EB, A, B>(ref: IORef<RA, RB, EA, EB, A, B>): IORef<RA, RB, EA, EB, never, B> {
  return ref
}

/**
 * Returns a write only view of the `IORef`.
 */
export function writeOnly<RA, RB, EA, EB, A, B>(ref: IORefM<RA, RB, EA, EB, A, B>): IORefM<RA, RB, EA, void, A, never>
export function writeOnly<RA, RB, EA, EB, A, B>(ref: IORef<RA, RB, EA, EB, A, B>): IORef<RA, RB, EA, void, A, never>
export function writeOnly<RA, RB, EA, EB, A, B>(ref: IORef<RA, RB, EA, EB, A, B>): IORef<RA, RB, EA, void, A, never> {
  return ref.fold(
    identity,
    () => undefined,
    E.Right,
    () => E.Left(undefined)
  )
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<RA, RB, EA, EB, B, A>(
  ref: IORef<RA, RB, EA, EB, A, A>,
  f: (a: A) => readonly [B, A]
): IO<RA & RB, EA | EB, B> {
  return pipe(
    ref,
    concrete,
    matchTag({
      Atomic: At.modify(f),
      AtomicM: (_) => withPermit(_.semaphore)(_.ref.get['<$>'](f)['>>='](([b, a]) => _.ref.set(a)['$>'](() => b))),
      Derived: (_) =>
        pipe(
          _.value,
          At.modify((s) =>
            pipe(
              s,
              _.getEither,
              E.match(
                (e) => tuple(E.Left(e), s),
                (a1) =>
                  pipe(f(a1), ([b, a2]) =>
                    pipe(
                      a2,
                      _.setEither,
                      E.match(
                        (e) => tuple(E.Left(e), s),
                        (s) => tuple(E.widenE<EA | EB>()(E.Right(b)), s)
                      )
                    )
                  )
              )
            )
          ),
          I.refail
        ),
      DerivedM: (_) =>
        withPermit(_.value.semaphore)(
          _.value.ref.get['>>='](
            flow(
              _.getEither,
              I.map(f),
              I.bind(([b, a]) =>
                _.setEither(a)
                  ['>>='](_.value.ref.set)
                  ['$>'](() => b)
              )
            )
          )
        ),
      DerivedAll: (self) =>
        pipe(
          self.value,
          At.modify((s) =>
            pipe(
              s,
              self.getEither,
              E.match(
                (e) => tuple(E.Left(e), s),
                (a1) =>
                  pipe(f(a1), ([b, a2]) =>
                    pipe(
                      self.setEither(a2)(s),
                      E.match(
                        (e) => tuple(E.Left(e), s),
                        (s) => tuple(E.widenE<EA | EB>()(E.Right(b)), s)
                      )
                    )
                  )
              )
            )
          ),
          I.refail
        ),
      DerivedAllM: (_) =>
        withPermit(_.value.semaphore)(
          _.value.ref.get['>>=']((s) =>
            pipe(
              _.getEither(s),
              I.map(f),
              I.bind(([b, a]) =>
                _.setEither(a)(s)
                  ['>>='](_.value.ref.set)
                  ['$>'](() => b)
              )
            )
          )
        )
    })
  )
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify<B, A>(
  f: (a: A) => readonly [B, A]
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => IO<RA & RB, EA | EB, B> {
  return (ref) => modify_(ref, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome_<RA, RB, EA, EB, A, B>(
  ref: IORef<RA, RB, EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<[B, A]>
): IO<RA & RB, EA | EB, B> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.modifySome(def)(f) },
      modify((a) =>
        pipe(
          f(a),
          O.getOrElse(() => tuple(def, a))
        )
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome<B>(
  def: B
): <A>(
  f: (a: A) => O.Option<[B, A]>
) => <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB, EA | EB, B> {
  return (f) => (ref) => modifySome_(ref, def, f)
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(ref: IORef<RA, RB, EA, EB, A, A>, a: A): IO<RA & RB, EA | EB, A> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.getAndSet(a) },
      modify((v) => tuple(v, a))
    )
  )
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet<A>(a: A): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => I.IO<RA & RB, EA | EB, A> {
  return (ref) => getAndSet_(ref, a)
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate_<RA, RB, EA, EB, A>(ref: IORef<RA, RB, EA, EB, A, A>, f: (a: A) => A) {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.getAndUpdate(f) },
      modify((v) => tuple(v, f(v)))
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate<A>(
  f: (a: A) => A
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => IO<RA & RB, EA | EB, A> {
  return (ref) => getAndUpdate_(ref, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome_<RA, RB, EA, EB, A>(
  ref: IORef<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): IO<RA & RB, EA | EB, A> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.getAndUpdateSome(f) },
      modify((v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (a) => tuple(v, a)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome<A>(
  f: (a: A) => O.Option<A>
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => IO<RA & RB, EA | EB, A> {
  return (ref) => getAndUpdateSome_(ref, f)
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update_<RA, RB, EA, EB, A>(
  ref: IORef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A
): IO<RA & RB, EA | EB, void> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.update(f) },
      modify((v) => tuple(undefined, f(v)))
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update<A>(
  f: (a: A) => A
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => IO<RA & RB, EA | EB, void> {
  return (ref) => update_(ref, f)
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet_<RA, RB, EA, EB, A>(
  ref: IORef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A
): IO<RA & RB, EA | EB, A> {
  return pipe(
    ref,
    concrete,
    matchTag({ Atomic: At.updateAndGet(f) }, (self) =>
      pipe(
        self,
        modify((v) => pipe(f(v), (result) => tuple(result, result))),
        I.bind(() => self.get)
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet<A>(
  f: (a: A) => A
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => IO<RA & RB, EA | EB, A> {
  return (ref) => updateAndGet_(ref, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<RA, RB, EA, EB, A>(
  ref: IORef<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): IO<RA & RB, EA | EB, void> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.updateSome(f) },
      modify((v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (a) => tuple(undefined, a)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome<A>(
  f: (a: A) => O.Option<A>
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => IO<RA & RB, EA | EB, void> {
  return (ref) => updateSome_(ref, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet_<RA, RB, EA, EB, A>(
  ref: IORef<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): IO<RA & RB, EA | EB, A> {
  return pipe(
    ref,
    concrete,
    matchTag(
      { Atomic: At.updateSomeAndGet(f) },
      modify((v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (result) => tuple(result, result)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet<A>(
  f: (a: A) => O.Option<A>
): <RA, RB, EA, EB>(ref: IORef<RA, RB, EA, EB, A, A>) => IO<RA & RB, EA | EB, A> {
  return (ref) => updateSomeAndGet_(ref, f)
}

/**
 * Reads the value from the `XRef`.
 */
export function get<RA, RB, EA, EB, A, B>(ref: IORef<RA, RB, EA, EB, A, B>): IO<RB, EB, B> {
  return ref.get
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set_<RA, RB, EA, EB, B, A>(ref: IORef<RA, RB, EA, EB, A, B>, a: A): IO<RA, EA, void> {
  return ref.set(a)
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set<A>(a: A): <RA, RB, EA, EB, B>(ref: IORef<RA, RB, EA, EB, A, B>) => IO<RA, EA, void> {
  return (ref) => ref.set(a)
}
