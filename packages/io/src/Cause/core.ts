import type { FiberId } from '../Fiber/FiberId'
import type { Eq } from '@principia/base/Eq'
import type { Predicate } from '@principia/base/Function'
import type * as HKT from '@principia/base/HKT'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Stack } from '@principia/base/util/support/Stack'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { makeEq } from '@principia/base/Eq'
import * as Ev from '@principia/base/Eval'
import { flow, identity, pipe } from '@principia/base/Function'
import * as F from '@principia/base/Function'
import * as O from '@principia/base/Option'
import { makeStack } from '@principia/base/util/support/Stack'

import { eqFiberId } from '../Fiber/FiberId'

export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E>

export interface Empty {
  readonly _tag: 'Empty'
}

export interface Fail<E> {
  readonly _tag: 'Fail'
  readonly value: E
}

export interface Die {
  readonly _tag: 'Die'
  readonly value: Error
}

export interface Interrupt {
  readonly _tag: 'Interrupt'
  readonly fiberId: FiberId
}

export interface Then<E> {
  readonly _tag: 'Then'
  readonly left: Cause<E>
  readonly right: Cause<E>
}

export interface Both<E> {
  readonly _tag: 'Both'
  readonly left: Cause<E>
  readonly right: Cause<E>
}

export const URI = 'Cause'

export type URI = typeof URI

export type V = HKT.Auto

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const empty: Cause<never> = {
  _tag: 'Empty'
}

/**
 * ```haskell
 * fail :: e -> Cause e
 * ```
 */
export function fail<E>(value: E): Cause<E> {
  return {
    _tag: 'Fail',
    value
  }
}

/**
 * ```haskell
 * die :: _ -> Cause Never
 * ```
 */
export function die(value: Error): Cause<never> {
  return {
    _tag: 'Die',
    value
  }
}

/**
 * ```haskell
 * interrupt :: FiberId -> Cause Never
 * ```
 */
export function interrupt(fiberId: FiberId): Cause<never> {
  return {
    _tag: 'Interrupt',
    fiberId
  }
}

/**
 * ```haskell
 * then :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export function then<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : { _tag: 'Then', left, right }
}

/**
 * ```haskell
 * both :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export function both<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : { _tag: 'Both', left, right }
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

/**
 * ```haskell
 * failed :: Cause e -> Boolean
 * ```
 *
 * Returns if the cause has a failure in it
 */
export const failed: <E>(cause: Cause<E>) => boolean = flow(
  failureOption,
  O.map(() => true),
  O.getOrElse(() => false)
)

/**
 * ```haskell
 * isThen :: Cause e -> Boolean
 * ```
 */
export function isThen<E>(cause: Cause<E>): cause is Then<E> {
  return cause._tag === 'Then'
}

/**
 * ```haskell
 * isBoth :: Cause e -> Boolean
 * ```
 */
export function isBoth<E>(cause: Cause<E>): cause is Both<E> {
  return cause._tag === 'Both'
}

/**
 * ```haskell
 * isEmpty :: Cause e -> Boolean
 * ```
 */
export function isEmpty<E>(cause: Cause<E>): boolean {
  if (cause._tag === 'Empty') {
    return true
  }
  let causes: Stack<Cause<E>> | undefined = undefined
  let current: Cause<E> | undefined       = cause
  while (current) {
    switch (current._tag) {
      case 'Die': {
        return false
      }
      case 'Fail': {
        return false
      }
      case 'Then': {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      case 'Both': {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      default: {
        current = undefined
      }
    }
    if (!current && causes) {
      current = causes.value
      causes  = causes.previous
    }
  }

  return true
}

/**
 * ```haskell
 * died :: Cause e -> Boolean
 * ```
 *
 * Returns if a cause contains a defect
 */
export function died<E>(cause: Cause<E>): cause is Die {
  return pipe(
    cause,
    dieOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * ```haskell
 * interrupted :: Cause e -> Boolean
 * ```
 *
 * Returns if the cause contains an interruption in it
 */
export function interrupted<E>(cause: Cause<E>): boolean {
  return pipe(
    cause,
    interruptOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * ```haskell
 * contains :: Cause -> Cause -> Boolean
 * ```
 *
 * Determines if this cause contains or is equal to the specified cause.
 */
export function contains<E, E1 extends E = E>(that: Cause<E1>): (cause: Cause<E>) => boolean {
  return (cause) =>
    equalsCause(that, cause) ||
    foldl_(cause, false as boolean, (_, c) => (equalsCause(that, c) ? O.some(true) : O.none()))
}

export function isCause(u: unknown): u is Cause<unknown> {
  return (
    typeof u === 'object' &&
    u !== null &&
    '_tag' in u &&
    ['Empty', 'Fail', 'Die', 'Interrupt', 'Then', 'Both'].includes(u['_tag'])
  )
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * @internal
 */
export function findSafe_<E, A>(cause: Cause<E>, f: (cause: Cause<E>) => O.Option<A>): Ev.Eval<O.Option<A>> {
  const apply = f(cause)
  if (apply._tag === 'Some') {
    return Ev.now(apply)
  }
  switch (cause._tag) {
    case 'Then': {
      return pipe(
        Ev.defer(() => findSafe_(cause.left, f)),
        Ev.bind((isLeft) => {
          if (isLeft._tag === 'Some') {
            return Ev.now(isLeft)
          } else {
            return findSafe_(cause.right, f)
          }
        })
      )
    }
    case 'Both': {
      return pipe(
        Ev.defer(() => findSafe_(cause.left, f)),
        Ev.bind((isLeft) => {
          if (isLeft._tag === 'Some') {
            return Ev.now(isLeft)
          } else {
            return findSafe_(cause.right, f)
          }
        })
      )
    }
    default: {
      return Ev.now(apply)
    }
  }
}

export function find_<E, A>(cause: Cause<E>, f: (cause: Cause<E>) => O.Option<A>): O.Option<A> {
  return findSafe_(cause, f).value
}

/**
 * ```haskell
 * find :: (Cause c, Option m) => (c e -> m a) -> c e -> m a
 * ```
 *
 * Finds the first result matching f
 *
 * @category Combinators
 * @since 1.0.0
 */
export function find<A, E>(f: (cause: Cause<E>) => O.Option<A>): (cause: Cause<E>) => O.Option<A> {
  return (cause) => find_(cause, f)
}

/**
 * @internal
 */
function foldSafe_<E, A>(
  cause: Cause<E>,
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A
): Ev.Eval<A> {
  switch (cause._tag) {
    case 'Empty':
      return Ev.now(onEmpty())
    case 'Fail':
      return Ev.now(onFail(cause.value))
    case 'Die':
      return Ev.now(onDie(cause.value))
    case 'Interrupt':
      return Ev.now(onInterrupt(cause.fiberId))
    case 'Both':
      return Ev.map2_(
        Ev.defer(() => foldSafe_(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)),
        Ev.defer(() => foldSafe_(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)),
        onBoth
      )
    case 'Then':
      return Ev.map2_(
        Ev.defer(() => foldSafe_(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)),
        Ev.defer(() => foldSafe_(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)),
        onThen
      )
  }
}

/**
 * ```haskell
 * fold :: (
 *    (() -> a),
 *    (e -> a),
 *    (_ -> a),
 *    (FiberId -> a),
 *    ((a, a) -> a),
 *    ((a, a) -> a)
 * ) -> Cause e -> a
 * ```
 *
 * Folds over a cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold<E, A>(
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A
): (cause: Cause<E>) => A {
  return (cause) => foldSafe_(cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth).value
}

/**
 * @internal
 */
function foldlSafe_<E, B>(cause: Cause<E>, b: B, f: (b: B, cause: Cause<E>) => O.Option<B>): Ev.Eval<B> {
  return Ev.gen(function* (_) {
    const apply = O.getOrElse_(f(b, cause), () => b)
    switch (cause._tag) {
      case 'Then': {
        const l = yield* _(foldlSafe_(cause.left, apply, f))
        const r = yield* _(foldlSafe_(cause.right, l, f))
        return r
      }
      case 'Both': {
        const l = yield* _(foldlSafe_(cause.left, apply, f))
        const r = yield* _(foldlSafe_(cause.right, l, f))
        return r
      }
      default: {
        return apply
      }
    }
  })
}

/**
 * ```haskell
 * foldl_ :: (Cause c) => (c e, a, ((a, c e) -> Option a)) -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function foldl_<E, A>(cause: Cause<E>, a: A, f: (a: A, cause: Cause<E>) => O.Option<A>): A {
  let causes: Stack<Cause<E>> | undefined = undefined
  let current: Cause<E> | undefined       = cause
  let acc                                 = a

  while (current) {
    const x = f(acc, current)
    acc     = x._tag === 'Some' ? x.value : acc

    switch (current._tag) {
      case 'Then': {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      case 'Both': {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      default: {
        current = undefined
        break
      }
    }

    if (!current && causes) {
      current = causes.value
      causes  = causes.previous
    }
  }
  return acc
}

/**
 * ```haskell
 * foldl :: (Cause c) => (a, ((a, c e) -> Option a)) -> c e -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function foldl<E, A>(a: A, f: (a: A, cause: Cause<E>) => O.Option<A>): (cause: Cause<E>) => A {
  return (cause) => foldl_(cause, a, f)
}

/**
 * ```haskell
 * interruptOption :: Cause e -> Option FiberId
 * ```
 *
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export function interruptOption<E>(cause: Cause<E>): O.Option<FiberId> {
  return find_(cause, (c) => (c._tag === 'Interrupt' ? O.some(c.fiberId) : O.none()))
}

/**
 * ```haskell
 * failureOption :: Cause e -> Option e
 * ```
 *
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export function failureOption<E>(cause: Cause<E>): O.Option<E> {
  return find_(cause, (c) => (c._tag === 'Fail' ? O.some(c.value) : O.none()))
}

/**
 * ```haskell
 * dieOption :: Cause e -> Option _
 * ```
 *
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export function dieOption<E>(cause: Cause<E>): O.Option<unknown> {
  return find_(cause, (c) => (c._tag === 'Die' ? O.some(c.value) : O.none()))
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E>(fa: Cause<E>, that: () => Cause<E>): Cause<E> {
  return bind_(fa, () => that())
}

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> fa -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<E>(that: () => Cause<E>): (fa: Cause<E>) => Cause<E> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info a `Cause`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<E>(e: E): Cause<E> {
  return fail(e)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<E, D>(fab: Cause<(a: E) => D>, fa: Cause<E>): Cause<D> {
  return bind_(fab, (f) => map_(fa, f))
}

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<E>(fa: Cause<E>): <D>(fab: Cause<(a: E) => D>) => Cause<D> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

export function equalsCause<E>(x: Cause<E>, y: Cause<E>): boolean {
  switch (x._tag) {
    case 'Fail': {
      return y._tag === 'Fail' && x.value === y.value
    }
    case 'Empty': {
      return y._tag === 'Empty'
    }
    case 'Die': {
      return (
        y._tag === 'Die' &&
        ((x.value instanceof Error &&
          y.value instanceof Error &&
          x.value.name === y.value.name &&
          x.value.message === y.value.message) ||
          x.value === y.value)
      )
    }
    case 'Interrupt': {
      return y._tag === 'Interrupt' && eqFiberId.equals(x.fiberId)(y.fiberId)
    }
    case 'Both': {
      return y._tag === 'Both' && equalsCause(x.left, y.left) && equalsCause(x.right, y.right)
    }
    case 'Then': {
      return y._tag === 'Then' && equalsCause(x.left, y.left) && equalsCause(x.right, y.right)
    }
  }
}

export const eqCause: Eq<Cause<any>> = makeEq(equalsCause)

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<E, D>(fa: Cause<E>, f: (e: E) => D) {
  return bind_(fa, (e) => fail(f(e)))
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<E, D>(f: (e: E) => D): (fa: Cause<E>) => Cause<D> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

/**
 * @internal
 */
function bindSafe_<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Ev.Eval<Cause<D>> {
  switch (ma._tag) {
    case 'Empty':
      return Ev.now(empty)
    case 'Fail':
      return Ev.now(f(ma.value))
    case 'Die':
      return Ev.now(ma)
    case 'Interrupt':
      return Ev.now(ma)
    case 'Then':
      return Ev.map2_(
        Ev.defer(() => bindSafe_(ma.left, f)),
        Ev.defer(() => bindSafe_(ma.right, f)),
        then
      )
    case 'Both':
      return Ev.map2_(
        Ev.defer(() => bindSafe_(ma.left, f)),
        Ev.defer(() => bindSafe_(ma.right, f)),
        both
      )
  }
}

/**
 * ```haskell
 * bind_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind_<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Cause<D> {
  return bindSafe_(ma, f).value
}

/**
 * ```haskell
 * bind :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind<E, D>(f: (e: E) => Cause<D>): (ma: Cause<E>) => Cause<D> {
  return (ma) => bind_(ma, f)
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Cuase`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<E>(mma: Cause<Cause<E>>): Cause<E> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Cause<void> {
  return fail(undefined)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * ```haskell
 * as :: Functor f => b -> f a -> f b
 * ```
 *
 * Substitutes a value under a type constructor
 *
 * @category Combinators
 * @since 1.0.0
 */
export function as<E1>(e: E1): <E>(fa: Cause<E>) => Cause<E1> {
  return map(() => e)
}

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<E>(cause: Cause<E>): ReadonlyArray<unknown> {
  return foldl_(cause, [] as ReadonlyArray<unknown>, (a, c) => (c._tag === 'Die' ? O.some([...a, c.value]) : O.none()))
}

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(cause: Cause<E>): ReadonlyArray<E> {
  return foldl_(cause, [] as readonly E[], (a, c) => (c._tag === 'Fail' ? O.some([...a, c.value]) : O.none()))
}

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export function interruptors<E>(cause: Cause<E>): ReadonlySet<FiberId> {
  return foldl_(cause, new Set(), (s, c) => (c._tag === 'Interrupt' ? O.some(s.add(c.fiberId)) : O.none()))
}

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function interruptedOnly<E>(cause: Cause<E>): boolean {
  return pipe(
    cause,
    find((c) => (died(c) || failed(c) ? O.some(false) : O.none())),
    O.getOrElse(() => true)
  )
}

/**
 * @internal
 */
function stripFailuresSafe<E>(cause: Cause<E>): Ev.Eval<Cause<never>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(empty)
    }
    case 'Fail': {
      return Ev.now(empty)
    }
    case 'Interrupt': {
      return Ev.now(cause)
    }
    case 'Die': {
      return Ev.now(cause)
    }
    case 'Both': {
      return Ev.map2_(
        Ev.defer(() => stripFailuresSafe(cause.left)),
        Ev.defer(() => stripFailuresSafe(cause.right)),
        both
      )
    }
    case 'Then': {
      return Ev.map2_(
        Ev.defer(() => stripFailuresSafe(cause.left)),
        Ev.defer(() => stripFailuresSafe(cause.right)),
        then
      )
    }
  }
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<E>(cause: Cause<E>): Cause<never> {
  return stripFailuresSafe(cause).value
}

/**
 * @internal
 */
export function stripInterruptsSafe<E>(cause: Cause<E>): Ev.Eval<Cause<E>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(empty)
    }
    case 'Fail': {
      return Ev.now(cause)
    }
    case 'Interrupt': {
      return Ev.now(empty)
    }
    case 'Die': {
      return Ev.now(cause)
    }
    case 'Both': {
      return Ev.map2_(
        Ev.defer(() => stripInterruptsSafe(cause.left)),
        Ev.defer(() => stripInterruptsSafe(cause.right)),
        both
      )
    }
    case 'Then': {
      return Ev.map2_(
        Ev.defer(() => stripInterruptsSafe(cause.left)),
        Ev.defer(() => stripInterruptsSafe(cause.right)),
        then
      )
    }
  }
}

/**
 * Discards all interrupts kept on this `Cause`.
 */
export function stripInterrupts<E>(cause: Cause<E>): Cause<E> {
  return stripInterruptsSafe(cause).value
}

function stripSomeDefectsSafe<E>(cause: Cause<E>, pf: Predicate<unknown>): Ev.Eval<O.Option<Cause<E>>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(O.none())
    }
    case 'Interrupt': {
      return Ev.now(O.some(interrupt(cause.fiberId)))
    }
    case 'Fail': {
      return Ev.now(O.some(fail(cause.value)))
    }
    case 'Die': {
      return Ev.now(pf(cause.value) ? O.some(die(cause.value)) : O.none())
    }
    case 'Both': {
      return Ev.map2_(
        Ev.defer(() => stripSomeDefectsSafe(cause.left, pf)),
        Ev.defer(() => stripSomeDefectsSafe(cause.right, pf)),
        (left, right) => {
          return left._tag === 'Some'
            ? right._tag === 'Some'
              ? O.some(both(left.value, right.value))
              : left
            : right._tag === 'Some'
            ? right
            : O.none()
        }
      )
    }
    case 'Then': {
      return Ev.map2_(
        Ev.defer(() => stripSomeDefectsSafe(cause.left, pf)),
        Ev.defer(() => stripSomeDefectsSafe(cause.right, pf)),
        (left, right) => {
          return left._tag === 'Some'
            ? right._tag === 'Some'
              ? O.some(then(left.value, right.value))
              : left
            : right._tag === 'Some'
            ? right
            : O.none()
        }
      )
    }
  }
}

export function stripSomeDefects_<E>(cause: Cause<E>, pf: Predicate<unknown>): O.Option<Cause<E>> {
  return stripSomeDefectsSafe(cause, pf).value
}

export function stripSomeDefects(pf: Predicate<unknown>): <E>(cause: Cause<E>) => O.Option<Cause<E>> {
  return (cause) => stripSomeDefectsSafe(cause, pf).value
}

/**
 * @internal
 */
function keepDefectsSafe<E>(cause: Cause<E>): Ev.Eval<O.Option<Cause<never>>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(O.none())
    }
    case 'Fail': {
      return Ev.now(O.none())
    }
    case 'Interrupt': {
      return Ev.now(O.none())
    }
    case 'Die': {
      return Ev.now(O.some(cause))
    }
    case 'Then': {
      return Ev.map2_(
        Ev.defer(() => keepDefectsSafe(cause.left)),
        Ev.defer(() => keepDefectsSafe(cause.right)),
        (lefts, rights) => {
          if (lefts._tag === 'Some' && rights._tag === 'Some') {
            return O.some(then(lefts.value, rights.value))
          } else if (lefts._tag === 'Some') {
            return lefts
          } else if (rights._tag === 'Some') {
            return rights
          } else {
            return O.none()
          }
        }
      )
    }
    case 'Both': {
      return Ev.map2_(
        Ev.defer(() => keepDefectsSafe(cause.left)),
        Ev.defer(() => keepDefectsSafe(cause.right)),
        (lefts, rights) => {
          if (lefts._tag === 'Some' && rights._tag === 'Some') {
            return O.some(both(lefts.value, rights.value))
          } else if (lefts._tag === 'Some') {
            return lefts
          } else if (rights._tag === 'Some') {
            return rights
          } else {
            return O.none()
          }
        }
      )
    }
  }
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export function keepDefects<E>(cause: Cause<E>): O.Option<Cause<never>> {
  return keepDefectsSafe(cause).value
}

function sequenceCauseEitherSafe<E, A>(cause: Cause<E.Either<E, A>>): Ev.Eval<E.Either<Cause<E>, A>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(E.left(empty))
    }
    case 'Interrupt': {
      return Ev.now(E.left(cause))
    }
    case 'Fail': {
      return Ev.now(cause.value._tag === 'Left' ? E.left(fail(cause.value.left)) : E.right(cause.value.right))
    }
    case 'Die': {
      return Ev.now(E.left(cause))
    }
    case 'Then': {
      return Ev.map2_(
        Ev.defer(() => sequenceCauseEitherSafe(cause.left)),
        Ev.defer(() => sequenceCauseEitherSafe(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Left'
            ? rights._tag === 'Right'
              ? E.right(rights.right)
              : E.left(then(lefts.left, rights.left))
            : E.right(lefts.right)
        }
      )
    }
    case 'Both': {
      return Ev.map2_(
        Ev.defer(() => sequenceCauseEitherSafe(cause.left)),
        Ev.defer(() => sequenceCauseEitherSafe(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Left'
            ? rights._tag === 'Right'
              ? E.right(rights.right)
              : E.left(both(lefts.left, rights.left))
            : E.right(lefts.right)
        }
      )
    }
  }
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEither<E, A>(cause: Cause<E.Either<E, A>>): E.Either<Cause<E>, A> {
  return sequenceCauseEitherSafe(cause).value
}

function sequenceCauseOptionSafe<E>(cause: Cause<O.Option<E>>): Ev.Eval<O.Option<Cause<E>>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(O.some(empty))
    }
    case 'Interrupt': {
      return Ev.now(O.some(cause))
    }
    case 'Fail': {
      return Ev.now(O.map_(cause.value, fail))
    }
    case 'Die': {
      return Ev.now(O.some(cause))
    }
    case 'Then': {
      return Ev.map2_(
        Ev.defer(() => sequenceCauseOptionSafe(cause.left)),
        Ev.defer(() => sequenceCauseOptionSafe(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Some'
            ? rights._tag === 'Some'
              ? O.some(then(lefts.value, rights.value))
              : lefts
            : rights._tag === 'Some'
            ? rights
            : O.none()
        }
      )
    }
    case 'Both': {
      return Ev.map2_(
        Ev.defer(() => sequenceCauseOptionSafe(cause.left)),
        Ev.defer(() => sequenceCauseOptionSafe(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Some'
            ? rights._tag === 'Some'
              ? O.some(both(lefts.value, rights.value))
              : lefts
            : rights._tag === 'Some'
            ? rights
            : O.none()
        }
      )
    }
  }
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>`.
 */
export function sequenceCauseOption<E>(cause: Cause<O.Option<E>>): O.Option<Cause<E>> {
  return sequenceCauseOptionSafe(cause).value
}

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export function failureOrCause<E>(cause: Cause<E>): E.Either<E, Cause<never>> {
  return pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
  )
}

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export function squash<E>(f: (e: E) => unknown): (cause: Cause<E>) => unknown {
  return (cause) =>
    pipe(
      cause,
      failureOption,
      O.map(f),
      O.alt(() =>
        interrupted(cause)
          ? O.some<unknown>(
              new InterruptedException(
                'Interrupted by fibers: ' +
                  Array.from(interruptors(cause))
                    .map((_) => _.seqNumber.toString())
                    .map((_) => '#' + _)
                    .join(', ')
              )
            )
          : O.none()
      ),
      O.alt(() => A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException())
    )
}

/*
 * -------------------------------------------
 * Errors
 * -------------------------------------------
 */

export class FiberFailure<E> extends Error {
  readonly _tag   = 'FiberFailure'
  readonly pretty = pretty(this.cause)

  constructor(readonly cause: Cause<E>) {
    super()

    this.name  = this._tag
    this.stack = undefined
  }
}

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u['_tag'] === 'FiberFailure'
}

export class Untraced extends Error {
  readonly _tag = 'Untraced'

  constructor(message?: string) {
    super(message)
    this.name  = this._tag
    this.stack = undefined
  }
}

export function isUntraced(u: unknown): u is Untraced {
  return u instanceof Error && u['_tag'] === 'Untraced'
}

export class RuntimeException extends Error {
  readonly _tag = 'RuntimeError'

  constructor(message?: string) {
    super(message)

    this.name = this._tag
  }
}

export function isRuntime(u: unknown): u is RuntimeException {
  return u instanceof Error && u['_tag'] === 'RuntimeError'
}

export class InterruptedException extends Error {
  readonly _tag = 'InterruptedException'

  constructor(message?: string) {
    super(message)
    this.name = this._tag
  }
}

export function isInterruptedException(u: unknown): u is InterruptedException {
  return u instanceof Error && u['_tag'] === 'InterruptedException'
}

export class IllegalStateException extends Error {
  readonly _tag = 'IllegalStateException'

  constructor(message?: string) {
    super(message)
    this.name = this._tag
  }
}

export function isIllegalStateException(u: unknown): u is IllegalStateException {
  return u instanceof Error && u['_tag'] === 'IllegalStateException'
}

export class IllegalArgumentException extends Error {
  readonly _tag = 'IllegalArgumentException'
  constructor(message?: string) {
    super(message)
    this.name = this._tag
  }
}

export function isIllegalArgumentException(u: unknown): u is IllegalArgumentException {
  return u instanceof Error && u['_tag'] === 'IllegalArgumentException'
}

/*
 * -------------------------------------------
 * Render
 * -------------------------------------------
 */

type Segment = Sequential | Parallel | Failure

type Step = Parallel | Failure

interface Failure {
  _tag: 'Failure'
  lines: string[]
}

interface Parallel {
  _tag: 'Parallel'
  all: Sequential[]
}

interface Sequential {
  _tag: 'Sequential'
  all: Step[]
}

const Failure = (lines: string[]): Failure => ({
  _tag: 'Failure',
  lines
})

const Sequential = (all: Step[]): Sequential => ({
  _tag: 'Sequential',
  all
})

const Parallel = (all: Sequential[]): Parallel => ({
  _tag: 'Parallel',
  all
})

const headTail = <A>(a: NonEmptyArray<A>): [A, A[]] => {
  const x    = [...a]
  const head = x.shift() as A
  return [head, x]
}

const lines = (s: string) => s.split('\n').map((s) => s.replace('\r', '')) as string[]

const prefixBlock = (values: readonly string[], p1: string, p2: string): string[] =>
  A.isNonEmpty(values)
    ? pipe(headTail(values), ([head, tail]) => [`${p1}${head}`, ...tail.map((_) => `${p2}${_}`)])
    : []

const renderInterrupt = (fiberId: FiberId): Sequential =>
  Sequential([Failure([`An interrupt was produced by #${fiberId.seqNumber}.`])])

const renderError = (error: Error): string[] => lines(error.stack ? error.stack : String(error))

const renderDie = (error: Error): Sequential =>
  Sequential([Failure(['An unchecked error was produced.', '', ...renderError(error)])])

const renderDieUnknown = (error: string[]): Sequential =>
  Sequential([Failure(['An unchecked error was produced.', '', ...error])])

const renderFail = (error: string[]): Sequential =>
  Sequential([Failure(['A checked error was not handled.', '', ...error])])

const renderFailError = (error: Error): Sequential =>
  Sequential([Failure(['A checked error was not handled.', '', ...renderError(error)])])

const causeToSequential = <E>(cause: Cause<E>): Ev.Eval<Sequential> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case 'Empty': {
        return Sequential([])
      }
      case 'Fail': {
        return cause.value instanceof Error
          ? renderFailError(cause.value)
          : renderFail(lines(JSON.stringify(cause.value, null, 2)))
      }
      case 'Die': {
        return cause.value instanceof Error
          ? renderDie(cause.value)
          : renderDieUnknown(lines(JSON.stringify(cause.value, null, 2)))
      }
      case 'Interrupt': {
        return renderInterrupt(cause.fiberId)
      }
      case 'Then': {
        return Sequential(yield* _(linearSegments(cause)))
      }
      case 'Both': {
        return Sequential([Parallel(yield* _(parallelSegments(cause)))])
      }
    }
  })

const linearSegments = <E>(cause: Cause<E>): Ev.Eval<Step[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case 'Then': {
        return [...(yield* _(linearSegments(cause.left))), ...(yield* _(linearSegments(cause.right)))]
      }
      default: {
        return (yield* _(causeToSequential(cause))).all
      }
    }
  })

const parallelSegments = <E>(cause: Cause<E>): Ev.Eval<Sequential[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case 'Both': {
        return [...(yield* _(parallelSegments(cause.left))), ...(yield* _(parallelSegments(cause.right)))]
      }
      default: {
        return [yield* _(causeToSequential(cause))]
      }
    }
  })

const times = (s: string, n: number) => {
  let h = ''

  for (let i = 0; i < n; i += 1) {
    h += s
  }

  return h
}

const format = (segment: Segment): readonly string[] => {
  switch (segment._tag) {
    case 'Failure': {
      return prefixBlock(segment.lines, '─', ' ')
    }
    case 'Parallel': {
      return [
        times('══╦', segment.all.length - 1) + '══╗',
        ...A.foldr_(segment.all, [] as string[], (current, acc) => [
          ...prefixBlock(acc, '  ║', '  ║'),
          ...prefixBlock(format(current), '  ', '  ')
        ])
      ]
    }
    case 'Sequential': {
      return A.bind_(segment.all, (seg) => ['║', ...prefixBlock(format(seg), '╠', '║'), '▼'])
    }
  }
}

const prettyLines = <E>(cause: Cause<E>): Ev.Eval<readonly string[]> =>
  Ev.gen(function* (_) {
    const s = yield* _(causeToSequential(cause))

    if (s.all.length === 1 && s.all[0]._tag === 'Failure') {
      return s.all[0].lines
    }

    return O.getOrElse_(A.updateAt(0, '╥')(format(s)), (): string[] => [])
  })

export function prettySafe<E>(cause: Cause<E>): Ev.Eval<string> {
  return Ev.gen(function* (_) {
    const lines = yield* _(prettyLines(cause))
    return lines.join('\n')
  })
}

export function pretty<E>(cause: Cause<E>): string {
  return prettySafe(cause).value
}
