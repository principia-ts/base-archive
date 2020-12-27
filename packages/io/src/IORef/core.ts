import type { FIO, UIO } from "../IO/core";

import * as E from "@principia/base/data/Either";
import { identity, pipe, tuple } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import { AtomicReference } from "@principia/base/util/support/AtomicReference";

import * as I from "../IO/core";
import { matchTag } from "@principia/base/util/matchers";
import * as At from "./atomic";

export interface IORef<EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `IORef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `IORef`. For most use cases one of the more specific
   * combinators implemented in terms of `fold` will be more ergonomic but this
   * method is extremely useful for implementing new combinators.
   */
  readonly fold: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => IORef<EC, ED, C, D>;

  /**
   * Folds over the error and value types ofthe `IORef`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `fold` but requires unifying the error types.
   */
  readonly foldAll: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => IORef<EC, ED, C, D>;

  /**
   * Reads the value from the `IORef`.
   */
  readonly get: FIO<EB, B>;

  /**
   * Writes a new value to the `IORef`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => FIO<EA, void>;
}

export class DerivedAll<EA, EB, A, B, S> implements IORef<EA, EB, A, B> {
  readonly _tag = "DerivedAll";

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
  ): IORef<EC, ED, C, D> =>
    new DerivedAll(
      this.value,
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        E.flatMap_(ca(c), (a) => E.fold_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right))
    );

  readonly foldAll = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): IORef<EC, ED, C, D> =>
    new DerivedAll(
      this.value,
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        pipe(
          this.getEither(s),
          E.fold((e) => E.left(ec(e)), ca(c)),
          E.deunion,
          E.flatMap((a) => E.fold_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right))
        )
    );

  readonly get: FIO<EB, B> = pipe(
    this.value.get,
    I.flatMap((a) => E.fold_(this.getEither(a), I.fail, I.pure))
  );

  readonly set: (a: A) => FIO<EA, void> = (a) =>
    pipe(
      this.value,
      modify((s) =>
        E.fold_(
          this.setEither(a)(s),
          (e) => [E.left(e), s] as [E.Either<EA, void>, S],
          (s) => [E.right(undefined), s] as [E.Either<EA, void>, S]
        )
      ),
      I.absolve
    );
}

export class Derived<EA, EB, A, B, S> implements IORef<EA, EB, A, B> {
  readonly _tag = "Derived";

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
  ): IORef<EC, ED, C, D> =>
    new Derived<EC, ED, C, D, S>(
      this.value,
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => E.flatMap_(ca(c), (a) => E.fold_(this.setEither(a), (e) => E.left(ea(e)), E.right))
    );

  readonly foldAll = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): IORef<EC, ED, C, D> =>
    new DerivedAll<EC, ED, C, D, S>(
      this.value,
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        pipe(
          this.getEither(s),
          E.fold((e) => E.left(ec(e)), ca(c)),
          E.deunion,
          E.flatMap((a) =>
            pipe(
              this.setEither(a),
              E.fold((e) => E.left(ea(e)), E.right)
            )
          )
        )
    );

  readonly get: FIO<EB, B> = pipe(
    this.value.get,
    I.flatMap((s) => E.fold_(this.getEither(s), I.fail, I.pure))
  );

  readonly set: (a: A) => FIO<EA, void> = (a) => E.fold_(this.setEither(a), I.fail, this.value.set);
}

export class Atomic<A> implements IORef<never, never, A, A> {
  readonly _tag = "Atomic";

  readonly fold = <EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): IORef<EC, ED, C, D> =>
    new Derived<EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (c) => ca(c)
    );

  readonly foldAll = <EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): IORef<EC, ED, C, D> =>
    new DerivedAll<EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (c) => (s) => ca(c)(s)
    );

  constructor(readonly value: AtomicReference<A>) {}

  get get(): UIO<A> {
    return I.total(() => this.value.get);
  }

  readonly set = (a: A): UIO<void> => {
    return I.total(() => {
      this.value.set(a);
    });
  };
}

/**
 * A Ref that can fail with error E
 */
export interface FRef<E, A> extends IORef<E, E, A, A> {}

/**
 * A Ref that cannot fail
 */
export interface URef<A> extends FRef<never, A> {}

/**
 * Cast to a sealed union in case of ERef (where it make sense)
 */
export const concrete = <EA, EB, A>(self: IORef<EA, EB, A, A>) =>
  self as Atomic<A> | DerivedAll<EA, EB, A, A, A> | Derived<EA, EB, A, A, A>;

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Creates a new `XRef` with the specified value.
 */
export function make<A>(a: A): UIO<URef<A>> {
  return I.total(() => new Atomic(new AtomicReference(a)));
}

/**
 * Creates a new `XRef` with the specified value.
 */
export function unsafeMake<A>(a: A): URef<A> {
  return new Atomic(new AtomicReference(a));
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export function bimapEither<A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
) {
  return <EA, EB>(_: IORef<EA, EB, A, B>): IORef<EC | EA, EB | ED, C, D> =>
    _.fold(
      (ea: EA | EC) => ea,
      (eb: EB | ED) => eb,
      f,
      g
    );
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export function bimapEither_<EA, EB, A, B, C, EC, D, ED>(
  _: IORef<EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): IORef<EC | EA, ED | EB, C, D> {
  return bimapEither(f, g)(_);
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export function bimap<A, B, C, D>(f: (_: C) => A, g: (_: B) => D) {
  return <EA, EB>(_: IORef<EA, EB, A, B>): IORef<EA, EB, C, D> =>
    pipe(
      _,
      bimapEither(
        (c) => E.right(f(c)),
        (b) => E.right(g(b))
      )
    );
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export function bimap_<EA, EB, A, B, C, D>(
  _: IORef<EA, EB, A, B>,
  f: (_: C) => A,
  g: (_: B) => D
): IORef<EA, EB, C, D> {
  return bimap(f, g)(_);
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export function bimapError<EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
): <A, B>(_: IORef<EA, EB, A, B>) => IORef<EC, ED, A, B> {
  return (_) => _.fold(f, g, E.right, E.right);
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export function bimapError_<A, B, EA, EB, EC, ED>(
  _: IORef<EA, EB, A, B>,
  f: (_: EA) => EC,
  g: (_: EB) => ED
): IORef<EC, ED, A, B> {
  return bimapError(f, g)(_);
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
export function contramapEither<A, EC, C>(
  f: (_: C) => E.Either<EC, A>
): <EA, EB, B>(_: IORef<EA, EB, A, B>) => IORef<EA | EC, EB, C, B> {
  return (_) =>
    pipe(
      _,
      bimapEither(f, (x) => E.right(x))
    );
}

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export function contramapEither_<A, EC, C, EA, EB, B>(
  _: IORef<EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>
): IORef<EC | EA, EB, C, B> {
  return contramapEither(f)(_);
}

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap: <A, C>(
  f: (_: C) => A
) => <EA, EB, B>(_: IORef<EA, EB, A, B>) => IORef<EA, EB, C, B> = (f) =>
  contramapEither((c) => E.right(f(c)));

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap_: <EA, EB, B, A, C>(
  _: IORef<EA, EB, A, B>,
  f: (_: C) => A
) => IORef<EA, EB, C, B> = (_, f) => contramap(f)(_);

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
export function filterInput_<EA, EB, B, A, A1 extends A>(
  _: IORef<EA, EB, A, B>,
  f: (_: A1) => boolean
): IORef<O.Option<EA>, EB, A1, B> {
  return _.fold(O.some, identity, (a) => (f(a) ? E.right(a) : E.left(O.none())), E.right);
}

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A>(
  f: (_: A1) => boolean
): <EA, EB, B>(_: IORef<EA, EB, A, B>) => IORef<O.Option<EA>, EB, A1, B> {
  return (_) => filterInput_(_, f);
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<EA, EB, A, B>(
  _: IORef<EA, EB, A, B>,
  f: (_: B) => boolean
): IORef<EA, O.Option<EB>, A, B> {
  return _.fold(identity, O.some, E.right, (b) => (f(b) ? E.right(b) : E.left(O.none())));
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (_: B) => boolean
): <EA, EB, A>(_: IORef<EA, EB, A, B>) => IORef<EA, O.Option<EB>, A, B> {
  return (_) => filterOutput_(_, f);
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
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): (ref: IORef<EA, EB, A, B>) => IORef<EC, ED, C, D> {
  return (ref) => ref.fold(ea, eb, ca, bd);
}

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold_<EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<EC, ED, C, D> {
  return ref.fold(ea, eb, ca, bd);
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): (ref: IORef<EA, EB, A, B>) => IORef<EC, ED, C, D> {
  return (ref) => ref.foldAll(ea, eb, ec, ca, bd);
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll_<EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<EC, ED, C, D> {
  return ref.foldAll(ea, eb, ec, ca, bd);
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
export const mapEither: <B, EC, C>(
  f: (_: B) => E.Either<EC, C>
) => <EA, EB, A>(_: IORef<EA, EB, A, B>) => IORef<EA, EC | EB, A, C> = (f) =>
  bimapEither((a) => E.right(a), f);

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export const mapEither_: <EA, EB, A, B, EC, C>(
  _: IORef<EA, EB, A, B>,
  f: (_: B) => E.Either<EC, C>
) => IORef<EA, EC | EB, A, C> = (_, f) => bimapEither_(_, (a) => E.right(a), f);

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export const map: <B, C>(
  f: (_: B) => C
) => <EA, EB, A>(_: IORef<EA, EB, A, B>) => IORef<EA, EB, A, C> = (f) =>
  mapEither((b) => E.right(f(b)));

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export const map_: <EA, EB, A, B, C>(
  _: IORef<EA, EB, A, B>,
  f: (_: B) => C
) => IORef<EA, EB, A, C> = (_, f) => mapEither_(_, (b) => E.right(f(b)));

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(
  pf: (_: B) => O.Option<C>
): <EA, EB, A>(_: IORef<EA, EB, A, B>) => IORef<EA, O.Option<EB>, A, C> {
  return (_) => _.fold(identity, O.some, E.right, (b) => E.fromOption_(pf(b), () => O.none()));
}

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<EA, EB, A, B, C>(
  _: IORef<EA, EB, A, B>,
  pf: (_: B) => O.Option<C>
): IORef<EA, O.Option<EB>, A, C> {
  return collect(pf)(_);
}

/**
 * Returns a read only view of the `XRef`.
 */
export function readOnly<EA, EB, A, B>(_: IORef<EA, EB, A, B>): IORef<EA, EB, never, B> {
  return _;
}

/**
 * Returns a write only view of the `XRef`.
 */
export function writeOnly<EA, EB, A, B>(_: IORef<EA, EB, A, B>): IORef<EA, void, A, never> {
  return _.fold(
    identity,
    () => undefined,
    E.right,
    () => E.left(undefined)
  );
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify<B, A>(f: (a: A) => readonly [B, A]) {
  return <EA, EB>(self: IORef<EA, EB, A, A>): FIO<EA | EB, B> =>
    pipe(
      self,
      concrete,
      matchTag({
        Atomic: At.modify(f),
        Derived: (self) =>
          pipe(
            self.value,
            At.modify((s) =>
              pipe(
                s,
                self.getEither,
                E.fold(
                  (e) => tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ([b, a2]) =>
                      pipe(
                        a2,
                        self.setEither,
                        E.fold(
                          (e) => tuple(E.left(e), s),
                          (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            I.absolve
          ),
        DerivedAll: (self) =>
          pipe(
            self.value,
            At.modify((s) =>
              pipe(
                s,
                self.getEither,
                E.fold(
                  (e) => tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ([b, a2]) =>
                      pipe(
                        self.setEither(a2)(s),
                        E.fold(
                          (e) => tuple(E.left(e), s),
                          (s) => tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            I.absolve
          )
      })
    );
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<EA, EB, B, A>(
  self: IORef<EA, EB, A, A>,
  f: (a: A) => readonly [B, A]
): FIO<EA | EB, B> {
  return modify(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome<B>(
  def: B
): <A>(f: (a: A) => O.Option<[B, A]>) => <EA, EB>(self: IORef<EA, EB, A, A>) => I.FIO<EA | EB, B> {
  return (f) => (self) =>
    pipe(
      self,
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
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome_<EA, EB, A, B>(
  self: IORef<EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<[B, A]>
): FIO<EA | EB, B> {
  return modifySome(def)(f)(self);
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet<A>(
  a: A
): <EA, EB>(self: IORef<EA, EB, A, A>) => I.UIO<A> | I.FIO<EA | EB, A> {
  return (self) =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.getAndSet(a) },
        modify((v) => tuple(v, a))
      )
    );
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet_<EA, EB, A>(self: IORef<EA, EB, A, A>, a: A) {
  return getAndSet(a)(self);
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate<A>(f: (a: A) => A) {
  return <EA, EB>(self: IORef<EA, EB, A, A>) =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.getAndUpdate(f) },
        modify((v) => tuple(v, f(v)))
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate_<EA, EB, A>(self: IORef<EA, EB, A, A>, f: (a: A) => A) {
  return getAndUpdate(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome<A>(f: (a: A) => O.Option<A>) {
  return <EA, EB>(self: IORef<EA, EB, A, A>) =>
    pipe(
      self,
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
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome_<EA, EB, A>(self: IORef<EA, EB, A, A>, f: (a: A) => O.Option<A>) {
  return getAndUpdateSome(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update<A>(f: (a: A) => A) {
  return <EA, EB>(self: IORef<EA, EB, A, A>): FIO<EA | EB, void> =>
    pipe(
      self,
      concrete,
      matchTag(
        { Atomic: At.update(f) },
        modify((v) => tuple(undefined, f(v)))
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update_<EA, EB, A>(self: IORef<EA, EB, A, A>, f: (a: A) => A): FIO<EA | EB, void> {
  return update(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return <EA, EB>(self: IORef<EA, EB, A, A>): FIO<EA | EB, A> =>
    pipe(
      self,
      concrete,
      matchTag({ Atomic: At.updateAndGet(f) }, (self) =>
        pipe(
          self,
          modify((v) => pipe(f(v), (result) => tuple(result, result))),
          I.flatMap(() => self.get)
        )
      )
    );
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet_<EA, EB, A>(
  self: IORef<EA, EB, A, A>,
  f: (a: A) => A
): FIO<EA | EB, A> {
  return updateAndGet(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome<A>(f: (a: A) => O.Option<A>) {
  return <EA, EB>(self: IORef<EA, EB, A, A>): FIO<EA | EB, void> =>
    pipe(
      self,
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
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<EA, EB, A>(
  self: IORef<EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): FIO<EA | EB, void> {
  return updateSome(f)(self);
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet<A>(f: (a: A) => O.Option<A>) {
  return <EA, EB>(self: IORef<EA, EB, A, A>): FIO<EA | EB, A> =>
    pipe(
      self,
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
    );
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet_<EA, EB, A>(
  self: IORef<EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): FIO<EA | EB, A> {
  return updateSomeAndGet(f)(self);
}

/**
 * Unsafe update value in a Ref<A>
 */
export function unsafeUpdate<A>(f: (a: A) => A) {
  return (self: URef<A>) =>
    pipe(
      self,
      concrete,
      matchTag({
        Atomic: At.unsafeUpdate(f),
        Derived: (self) =>
          pipe(
            self.value,
            At.unsafeUpdate((s) => pipe(s, self.getEither, E.merge, f, self.setEither, E.merge))
          ),
        DerivedAll: (self) =>
          pipe(
            self.value,
            At.unsafeUpdate((s) =>
              pipe(s, self.getEither, E.merge, f, (a) => self.setEither(a)(s), E.merge)
            )
          )
      })
    );
}

/**
 * Unsafe update value in a Ref<A>
 */
export function unsafeUpdate_<A>(self: URef<A>, f: (a: A) => A) {
  return unsafeUpdate(f)(self);
}

/**
 * Reads the value from the `XRef`.
 */
export function get<EA, EB, A, B>(self: IORef<EA, EB, A, B>) {
  return self.get;
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set<A>(a: A): <EA, EB, B>(self: IORef<EA, EB, A, B>) => I.FIO<EA, void> {
  return (self) => self.set(a);
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set_<EA, EB, B, A>(self: IORef<EA, EB, A, B>, a: A) {
  return self.set(a);
}
