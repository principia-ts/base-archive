/**
 * Everybody's favorite sum type
 *
 * Either represents values with two possibilities: Left<E> or Right<A>
 * By convention, the _Left_ constructor is used to hold an Error value
 * and the _Right_ constructor is used to hold a correct value
 */

import type { Eq } from './Eq'
import type { MorphismN, Predicate, Refinement } from './Function'
import type { EitherURI } from './Modules'
import type { Option } from './Option'
import type { Show } from './Show'
import type { These } from './These'

import { NoSuchElementError } from './Error'
import { _bind, flow, identity, pipe, tuple as mkTuple } from './Function'
import * as HKT from './HKT'
import * as O from './Option'
import * as T from './These'
import * as P from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Left<E> {
  readonly _tag: 'Left'
  readonly left: E
}

export interface Right<A> {
  readonly _tag: 'Right'
  readonly right: A
}

export type Either<E, A> = Left<E> | Right<A>

export type InferLeft<T extends Either<any, any>> = T extends Left<infer E> ? E : never

export type InferRight<T extends Either<any, any>> = T extends Right<infer A> ? A : never

export type V = HKT.V<'E', '+'>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Constructs a new `Either` holding a `Left` value.
 * This usually represents a failure, due to the right-bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export function Left<E = never, A = never>(e: E): Either<E, A> {
  return {
    _tag: 'Left',
    left: e
  }
}

/**
 * Constructs a new `Either` holding a `Right` value.
 * This usually represents a successful value due to the right bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export function Right<E = never, A = never>(a: A): Either<E, A> {
  return {
    _tag: 'Right',
    right: a
  }
}

/**
 * Takes a default and a nullable value, if the value is not nully,
 * turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable_<E, A>(a: A, e: () => E): Either<E, NonNullable<A>> {
  return a == null ? Left(e()) : Right(a as NonNullable<A>)
}

/**
 * Takes a default and a nullable value, if the value is not nully,
 * turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable<E>(e: () => E): <A>(a: A) => Either<E, NonNullable<A>> {
  return <A>(a: A): Either<E, NonNullable<A>> => (a == null ? Left(e()) : Right(a as NonNullable<A>))
}

export function fromNullableK_<E, A extends ReadonlyArray<unknown>, B>(
  f: (...args: A) => B | null | undefined,
  e: () => E
): (...args: A) => Either<E, NonNullable<B>> {
  const from = fromNullable(e)
  return (...args) => from(f(...args))
}

export function fromNullableK<E>(
  e: () => E
): <A extends readonly unknown[], B>(
  f: (...args: A) => B | null | undefined
) => (...args: A) => Either<E, NonNullable<B>> {
  return (f) => fromNullableK_(f, e)
}

/**
 * Constructs a new `Either` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatch<E, A>(thunk: () => A): Either<E, A> {
  try {
    return Right(thunk())
  } catch (e) {
    return Left(e)
  }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK_<A extends ReadonlyArray<unknown>, B, E>(
  f: MorphismN<A, B>,
  onThrow: (reason: unknown) => E
): (...args: A) => Either<E, B> {
  return (...a) =>
    pipe(
      tryCatch(() => f(...a)),
      mapLeft(onThrow)
    )
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK<E>(
  onThrow: (reason: unknown) => E
): <A extends ReadonlyArray<unknown>, B>(f: MorphismN<A, B>) => (...args: A) => Either<E, B> {
  return (f) => tryCatchK_(f, onThrow)
}

export type Json = boolean | number | string | null | JsonArray | JsonRecord

export interface JsonRecord extends Readonly<Record<string, Json>> {}

export interface JsonArray extends ReadonlyArray<Json> {}

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function parseJson(s: string): Either<unknown, Json> {
  return tryCatch(() => JSON.parse(s))
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function stringifyJson(u: unknown): Either<unknown, string> {
  return tryCatch(() => JSON.stringify(u))
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromOption_<E, A>(fa: Option<A>, onNothing: () => E): Either<E, A> {
  return fa._tag === 'None' ? Left(onNothing()) : Right(fa.value)
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromOption<E>(onNothing: () => E): <A>(fa: Option<A>) => Either<E, A> {
  return (fa) => fromOption_(fa, onNothing)
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate_<E, A, B extends A>(
  a: A,
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): Either<E, B>
export function fromPredicate_<E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A>
export function fromPredicate_<E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A> {
  return predicate(a) ? Right(a) : Left(onFalse(a))
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate<E, A, B extends A>(
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): (a: A) => Either<E, B>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A> {
  return (a) => fromPredicate_(a, predicate, onFalse)
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

/**
 * Returns `true` if the either is an instance of `Left`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isLeft<E, A>(fa: Either<E, A>): fa is Left<E> {
  return fa._tag === 'Left'
}

/**
 * Returns `true` if the either is an instance of `Right`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isRight<E, A>(fa: Either<E, A>): fa is Right<A> {
  return fa._tag === 'Right'
}

export function isEither(u: unknown): u is Either<unknown, unknown> {
  return typeof u === 'object' && u != null && '_tag' in u && (u['_tag'] === 'Left' || u['_tag'] === 'Right')
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function match_<E, A, B, C>(pab: Either<E, A>, onLeft: (e: E) => B, onRight: (a: A) => C): B | C {
  return isLeft(pab) ? onLeft(pab.left) : onRight(pab.right)
}

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function match<E, A, B, C>(onLeft: (e: E) => B, onRight: (a: A) => C): (pab: Either<E, A>) => B | C {
  return (pab) => match_(pab, onLeft, onRight)
}

/**
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse_<E, A, B>(pab: Either<E, A>, onLeft: (e: E) => B): A | B {
  return isLeft(pab) ? onLeft(pab.left) : pab.right
}

/**
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse<E, A, B>(f: (e: E) => B): (pab: Either<E, A>) => A | B {
  return (pab) => getOrElse_(pab, f)
}

/**
 * @category Destructors
 * @since 1.0.0
 */
export function merge<E, A>(pab: Either<E, A>): E | A {
  return match_(pab, identity, identity as any)
}

/*
 * -------------------------------------------
 * Align
 * -------------------------------------------
 */

export function alignWith_<E, A, E1, B, C>(
  fa: Either<E, A>,
  fb: Either<E1, B>,
  f: (_: These<A, B>) => C
): Either<E | E1, C> {
  return fa._tag === 'Left'
    ? fb._tag === 'Left'
      ? fa
      : Right(f(T.Right(fb.right)))
    : fb._tag === 'Left'
    ? Right(f(T.Left(fa.right)))
    : Right(f(T.Both(fa.right, fb.right)))
}

export function alignWith<A, E1, B, C>(
  fb: Either<E1, B>,
  f: (_: These<A, B>) => C
): <E>(fa: Either<E, A>) => Either<E | E1, C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<E, A, E1, B>(fa: Either<E, A>, fb: Either<E1, B>): Either<E | E1, These<A, B>> {
  return alignWith_(fa, fb, identity)
}

export function align<E1, B>(fb: Either<E1, B>): <E, A>(fa: Either<E, A>) => Either<E | E1, These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * Identifies an associative operation on a type constructor.
 * It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E, A, G>(fa: Either<E, A>, that: () => Either<G, A>): Either<E | G, A> {
  return isLeft(fa) ? that() : fa
}

/**
 * Identifies an associative operation on a type constructor.
 * It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<G, A>(that: () => Either<G, A>): <E>(fa: Either<E, A>) => Either<G | E, A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * Lifts a pure expression info an `Either`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <E = never, A = never>(a: A) => Either<E, A> = Right

/*
 * -------------------------------------------
 * ApplicativeExcept
 * -------------------------------------------
 */

export function catchAll_<E, A, E1, B>(fa: Either<E, A>, f: (e: E) => Either<E1, B>): Either<E1, A | B> {
  return match_(fa, f, Right)
}

export function catchAll<E, E1, B>(f: (e: E) => Either<E1, B>): <A>(fa: Either<E, A>) => Either<E1, A | B> {
  return (fa) => catchAll_(fa, f)
}

export function catchSome_<E, A, E1, B>(fa: Either<E, A>, f: (e: E) => Option<Either<E1, B>>): Either<E | E1, A | B> {
  return catchAll_(
    fa,
    flow(
      f,
      O.getOrElse((): Either<E | E1, A | B> => fa)
    )
  )
}

export function catchSome<E, E1, B>(
  f: (e: E) => Option<Either<E1, B>>
): <A>(fa: Either<E, A>) => Either<E | E1, A | B> {
  return (fa) => catchSome_(fa, f)
}

export function catchMap_<E, A, B>(fa: Either<E, A>, f: (e: E) => B): Either<never, A | B> {
  return catchAll_(fa, flow(f, Right))
}

export function catchMap<E, B>(f: (e: E) => B): <A>(fa: Either<E, A>) => Either<never, A | B> {
  return (fa) => catchMap_(fa, f)
}

export function attempt<E, A>(fa: Either<E, A>): Either<never, Either<E, A>> {
  return Right(fa)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<E, A, G, B>(fab: Either<G, (a: A) => B>, fa: Either<E, A>): Either<E | G, B> {
  return isLeft(fab) ? fab : isLeft(fa) ? fa : Right(fab.right(fa.right))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<E, A>(fa: Either<E, A>): <G, B>(fab: Either<G, (a: A) => B>) => Either<E | G, B> {
  return (fab) => ap_(fab, fa)
}

/**
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apl_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

/**
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apl<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, A> {
  return (fa) => apl_(fa, fb)
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apr_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apr<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, B> {
  return (fa) => apr_(fa, fb)
}

/**
 * Applies both `Either`s and if both are `Right`,
 * collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, readonly [A, B]> {
  return crossWith_(fa, fb, mkTuple)
}

/**
 * Applies both `Either`s and if both are `Right`,
 * collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/**
 * Applies both `Either`s and if both are `Right`,
 * maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function crossWith_<E, A, G, B, C>(fa: Either<E, A>, fb: Either<G, B>, f: (a: A, b: B) => C): Either<E | G, C> {
  return ap_(
    map_(fa, (a) => (b: B) => f(a, b)),
    fb
  )
}

/**
 * Applies both `Either`s and if both are `Right`,
 * maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function crossWith<A, G, B, C>(
  fb: Either<G, B>,
  f: (a: A, b: B) => C
): <E>(fa: Either<E, A>) => Either<G | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export function liftA2<A, B, C>(
  f: (a: A) => (b: B) => C
): <E>(fa: Either<E, A>) => <G>(fb: Either<G, B>) => Either<E | G, C> {
  return (fa) => (fb) => (isLeft(fa) ? Left(fa.left) : isLeft(fb) ? Left(fb.left) : Right(f(fa.right)(fb.right)))
}

/**
 * A pipeable version of `struct`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apS<N extends string, A, E1, B>(
  name: Exclude<N, keyof A>,
  fb: Either<E1, B>
): <E>(
  fa: Either<E, A>
) => Either<
  E | E1,
  {
    [K in keyof A | N]: K extends keyof A ? A[K] : B
  }
> {
  return flow(
    map((a) => (b: B) => _bind(a, name, b)),
    ap(fb)
  )
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

/**
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function swap<E, A>(pab: Either<E, A>): Either<A, E> {
  return isLeft(pab) ? Right(pab.left) : Left(pab.right)
}

/**
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap_<E, A, G, B>(pab: Either<E, A>, f: (e: E) => G, g: (a: A) => B): Either<G, B> {
  return isLeft(pab) ? Left(f(pab.left)) : Right(g(pab.right))
}

/**
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: Either<E, A>) => Either<G, B> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapLeft_<E, A, G>(pab: Either<E, A>, f: (e: E) => G): Either<G, A> {
  return isLeft(pab) ? Left(f(pab.left)) : pab
}

/**
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapLeft<E, G>(f: (e: E) => G): <A>(pab: Either<E, A>) => Either<G, A> {
  return (pab) => mapLeft_(pab, f)
}

/*
 * -------------------------------------------
 * Compactable
 * -------------------------------------------
 */

export function getCompactable<E>(M: P.Monoid<E>) {
  return HKT.instance<P.Compactable<[HKT.URI<EitherURI, V>], HKT.Fix<'E', E>>>({
    compact: (fa) => {
      return isLeft(fa) ? fa : fa.right._tag === 'None' ? Left(M.nat) : Right(fa.right.value)
    },

    separate: (fa) => {
      return isLeft(fa)
        ? [fa, fa]
        : isLeft(fa.right)
        ? [Right(fa.right.left), Left(M.nat)]
        : [Left(M.nat), Right(fa.right.right)]
    }
  })
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getEq<E, A>(eqE: Eq<E>, eqA: Eq<A>): Eq<Either<E, A>> {
  const equals_ = (x: Either<E, A>, y: Either<E, A>) =>
    x === y || (isLeft(x) ? isLeft(y) && eqE.equals_(x.left, y.left) : isRight(y) && eqA.equals_(x.right, y.right))
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}

/*
 * -------------------------------------------
 * Extend
 * -------------------------------------------
 */

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend_<E, A, B>(wa: Either<E, A>, f: (wa: Either<E, A>) => B): Either<E, B> {
  return isLeft(wa) ? wa : Right(f(wa))
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend<E, A, B>(f: (wa: Either<E, A>) => B): (wa: Either<E, A>) => Either<E, B> {
  return (wa) => extend_(wa, f)
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function duplicate<E, A>(wa: Either<E, A>): Either<E, Either<E, A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

/**
 * Builds a `Filterable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export function getFilterable<E>(M: P.Monoid<E>) {
  type FixE = HKT.Fix<'E', E>

  const empty = Left(M.nat)

  const partitionMap_: P.PartitionMapFn_<[HKT.URI<EitherURI, V>], FixE> = (fa, f) => {
    if (isLeft(fa)) {
      return [fa, fa]
    }
    const e = f(fa.right)
    return isLeft(e) ? [Right(e.left), empty] : [empty, Right(e.right)]
  }

  const partition_: P.PartitionFn_<[HKT.URI<EitherURI, V>], FixE> = <A>(
    fa: Either<E, A>,
    predicate: Predicate<A>
  ): readonly [Either<E, A>, Either<E, A>] => {
    return isLeft(fa) ? [fa, fa] : predicate(fa.right) ? [empty, Right(fa.right)] : [Right(fa.right), empty]
  }

  const filterMap_: P.FilterMapFn_<[HKT.URI<EitherURI, V>], FixE> = (fa, f) => {
    if (isLeft(fa)) {
      return fa
    }
    const ob = f(fa.right)
    return ob._tag === 'None' ? empty : Right(ob.value)
  }

  const filter_: P.FilterFn_<[HKT.URI<EitherURI, V>], FixE> = <A>(
    fa: Either<E, A>,
    predicate: Predicate<A>
  ): Either<E, A> => (isLeft(fa) ? fa : predicate(fa.right) ? fa : empty)

  return HKT.instance<P.Filterable<[HKT.URI<EitherURI, V>], FixE>>({
    ...Functor,
    filter_: filter_,
    filterMap_,
    partition_: partition_,
    partitionMap_,
    filter: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => filter_(fa, predicate),
    filterMap: (f) => (fa) => filterMap_(fa, f),
    partition: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => partition_(fa, predicate),
    partitionMap: (f) => (fa) => partitionMap_(fa, f)
  })
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function foldl_<E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B): B {
  return isLeft(fa) ? b : f(b, fa.right)
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: Either<E, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: Either<E, A>, f: (a: A) => M) => M {
  return (fa, f) => (isLeft(fa) ? M.nat : f(fa.right))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: Either<E, A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function foldr_<E, A, B>(fa: Either<E, A>, b: B, f: (a: A, b: B) => B): B {
  return isLeft(fa) ? b : f(fa.right, b)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: Either<E, A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<E, A, B>(fa: Either<E, A>, f: (a: A) => B): Either<E, B> {
  return isLeft(fa) ? fa : Right(f(fa.right))
}

/**
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Either<E, A>) => Either<E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind_<E, A, G, B>(fa: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, B> {
  return isLeft(fa) ? fa : f(fa.right)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind<A, G, B>(f: (e: A) => Either<G, B>): <E>(ma: Either<E, A>) => Either<G | E, B> {
  return (ma) => bind_(ma, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<E, A, G, B>(ma: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, A> {
  return bind_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap<A, G, B>(f: (a: A) => Either<G, B>): <E>(ma: Either<E, A>) => Either<G | E, A> {
  return (ma) => tap_(ma, f)
}

/**
 * Removes one level of nesting from a nested `Either`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<E, G, A>(mma: Either<E, Either<G, A>>): Either<E | G, A> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * MonadExcept
 * -------------------------------------------
 */

export function absolve<E, E1, A>(mma: Either<E, Either<E1, A>>): Either<E | E1, A> {
  return flatten(mma)
}

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplyMonoid<E, A>(M: P.Monoid<A>): P.Monoid<Either<E, A>> {
  return {
    ...getApplySemigroup<E, A>(M),
    nat: Right(M.nat)
  }
}

/*
 * -------------------------------------------
 * Semigroup
 * -------------------------------------------
 */

/**
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> {
  const combine_: P.CombineFn_<Either<E, A>> = (x, y) =>
    isLeft(y) ? x : isLeft(x) ? y : Right(S.combine_(x.right, y.right))
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/**
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values
 * are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getApplySemigroup<E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> {
  const combine_ = (x: Either<E, A>, y: Either<E, A>) =>
    isLeft(y) ? y : isLeft(x) ? x : Right(S.combine_(x.right, y.right))
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getShow<E, A>(showE: Show<E>, showA: Show<A>): Show<Either<E, A>> {
  return {
    show: (fa) => (isLeft(fa) ? `left(${showE.show(fa.left)})` : `right(${showA.show(fa.right)})`)
  }
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_ = P.implementTraverse_<[HKT.URI<EitherURI>], V>()((_) => (F) => {
  return (ta, f) =>
    isLeft(ta)
      ? F.pure(Left(ta.left))
      : pipe(
          f(ta.right),
          F.map((b) => Right(b))
        )
})

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[HKT.URI<EitherURI>], V> = (F) => (f) => (ta) => traverse_(F)(ta, f)

/**
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[HKT.URI<EitherURI>], V> = (F) => (ta) => traverse_(F)(ta, identity)

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

/**
 * The unit `Either`
 */
export function unit<E = never>(): Either<E, void> {
  return Right(undefined)
}

/*
 * -------------------------------------------
 * Witherable
 * -------------------------------------------
 */

/**
 * Builds a `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export function getWitherable<E>(M: P.Monoid<E>) {
  type V_ = V & HKT.Fix<'E', E>

  const Compactable = getCompactable(M)

  const compactA_: P.WitherFn_<[HKT.URI<EitherURI>], V_> = (G) => (wa, f) => {
    const traverseF = traverse_(G)
    return pipe(traverseF(wa, f), G.map(Compactable.compact))
  }

  const separateA_: P.WiltFn_<[HKT.URI<EitherURI>], V_> = (G) => (wa, f) => {
    const traverseF = traverse_(G)
    return pipe(traverseF(wa, f), G.map(Compactable.separate))
  }

  return HKT.instance<P.Witherable<[HKT.URI<EitherURI>], V_>>({
    compactA_: compactA_,
    separateA_: separateA_,
    compactA: (G) => (f) => (wa) => compactA_(G)(wa, f),
    separateA: (G) => (f) => (wa) => separateA_(G)(wa, f)
  })
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: P.Functor<[HKT.URI<EitherURI>], V> = HKT.instance({
  map_,
  map
})

export const flap_   = P.flapF_<[HKT.URI<EitherURI>], V>(Functor)
export const flap    = P.flapF<[HKT.URI<EitherURI>], V>(Functor)
export const as_     = P.asF_<[HKT.URI<EitherURI>], V>(Functor)
export const as      = P.asF<[HKT.URI<EitherURI>], V>(Functor)
export const fcross_ = P.fcrossF_<[HKT.URI<EitherURI>], V>(Functor)
export const fcross  = P.fcrossF<[HKT.URI<EitherURI>], V>(Functor)

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[HKT.URI<EitherURI>], V> = HKT.instance({
  ...Functor,
  bimap_,
  bimap,
  mapLeft_,
  mapLeft
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: P.Alt<[HKT.URI<EitherURI>], V> = HKT.instance({
  ...Functor,
  alt_,
  alt
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monoidal: P.Monoidal<[HKT.URI<EitherURI>], V> = HKT.instance({
  ...Functor,
  crossWith_,
  crossWith,
  pure
})

export const sequenceT = P.sequenceTF(Monoidal)
export const mapN      = P.mapNF(Monoidal)
export const mapN_     = P.mapNF_(Monoidal)
export const sequenceS = P.sequenceSF(Monoidal)

/**
 * @category Instances
 * @since 1.0.0
 */
export const Fail: P.Fail<[HKT.URI<EitherURI>], V> = HKT.instance({
  fail: Left
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad: P.Monad<[HKT.URI<EitherURI>], V> = HKT.instance({
  ...Monoidal,
  bind_,
  bind
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonoidalExcept: P.MonoidalExcept<[HKT.URI<EitherURI>], V> = HKT.instance({
  ...Monoidal,
  ...Fail,
  catchAll_,
  catchAll
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonadExcept: P.MonadExcept<[HKT.URI<EitherURI>], V> = HKT.instance({
  ...MonoidalExcept,
  ...Monad
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Foldable: P.Foldable<[HKT.URI<EitherURI>], V> = HKT.instance({
  foldl_,
  foldMap_,
  foldr_,
  foldl,
  foldMap,
  foldr
})

/**
 * @category Instances
 * @since 1.0.0
 */

export const Semialign: P.Semialign<[HKT.URI<EitherURI>], V> = HKT.instance({
  alignWith_,
  alignWith
})

export const alignCombine_ = P.alignCombineF_<[HKT.URI<EitherURI>], V>(Semialign)
export const alignCombine  = P.alignCombineF<[HKT.URI<EitherURI>], V>(Semialign)
export const padZip_       = P.padZipF_<[HKT.URI<EitherURI>], V>(Semialign)
export const padZip        = P.padZipF<[HKT.URI<EitherURI>], V>(Semialign)
export const padZipWith_   = P.padZipWithF_<[HKT.URI<EitherURI>], V>(Semialign)
export const padZipWith    = P.padZipWithF<[HKT.URI<EitherURI>], V>(Semialign)
export const zipAll_       = P.zipAllF_<[HKT.URI<EitherURI>], V>(Semialign)
export const zipAll        = P.zipAllF<[HKT.URI<EitherURI>], V>(Semialign)

/**
 * @category Instances
 * @since 1.0.0
 */
export const Traversable: P.Traversable<[HKT.URI<EitherURI>], V> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
})

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

/**
 * @category Do
 * @since 1.0.0
 */
export const Do = P.deriveDo(Monad)

/**
 * @category Do
 * @since 1.0.0
 */
const of: Either<never, {}> = Right({})
export { of as do }

/**
 * Contributes a computation to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const bindS = P.bindSF(Monad)

/**
 * Contributes a pure value to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const letS = P.letSF(Monad)

/**
 * Binds a computation to a property in a `Record`.
 *
 * @category Do
 * @since 1.0.0
 */
export const bindToS = P.bindToSF(Monad)

/*
 * -------------------------------------------
 * Validation
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getMonoidalValidation<E>(S: P.Semigroup<E>) {
  type FixE = V & HKT.Fix<'E', E>

  const crossWithV_: P.CrossWithFn_<[HKT.URI<EitherURI>], FixE> = (fa, fb, f) =>
    isLeft(fa) ? (isLeft(fb) ? Left(S.combine_(fa.left, fb.left)) : fa) : isLeft(fb) ? fb : Right(f(fa.right, fb.right))

  return HKT.instance<P.Monoidal<[HKT.URI<EitherURI>], FixE>>({
    ...Functor,
    crossWith_: crossWithV_,
    crossWith: (fb, f) => (fa) => crossWithV_(fa, fb, f),
    pure
  })
}

/**
 * @category Instances
 * @since 1.0.0
 */
export function getAltValidation<E>(S: P.Semigroup<E>) {
  type FixE = V & HKT.Fix<'E', E>

  const altV_: P.AltFn_<[HKT.URI<EitherURI>], FixE> = (fa, that) => {
    if (isRight(fa)) {
      return fa
    }
    const ea = that()
    return isLeft(ea) ? Left(S.combine_(fa.left, ea.left)) : ea
  }

  return HKT.instance<P.Alt<[HKT.URI<EitherURI>], FixE>>({
    ...Functor,
    alt_: altV_,
    alt: (that) => (fa) => altV_(fa, that)
  })
}

/*
 * -------------------------------------------
 * Gen
 * -------------------------------------------
 */

const adapter: {
  <E, A>(_: Option<A>, onNone: () => E): P.GenHKT<Either<E, A>, A>
  <A>(_: Option<A>): P.GenHKT<Either<NoSuchElementError, A>, A>
  <E, A>(_: Either<E, A>): P.GenHKT<Either<E, A>, A>
} = (_: any, __?: any) => {
  if (O.isOption(_)) {
    return new P.GenHKT(fromOption_(_, () => (__ ? __() : new NoSuchElementError('Either.gen'))))
  }
  return new P.GenHKT(_)
}

export const gen = P.genF(Monad, { adapter })

/*
 * -------------------------------------------
 * Util
 * -------------------------------------------
 */

/**
 * Compact type Either<E, A> | Either<E1, B> to Either<E | E1, A | B>
 */
export const deunion: <T extends Either<any, any>>(
  fa: T
) => [T] extends [Either<infer E, infer A>] ? Either<E, A> : T = identity as any

export function widenE<E1>(): <E, A>(fa: Either<E, A>) => Either<E1 | E, A> {
  return identity
}

export function widenA<A1>(): <E, A>(fa: Either<E, A>) => Either<E, A1 | A> {
  return identity
}

export { EitherURI } from './Modules'
