import type { FiberId } from '../Fiber/FiberId'
import type { Trace } from '../Fiber/trace'
import type { Eq } from '@principia/base/Eq'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Predicate } from '@principia/base/Predicate'
import type { Stack } from '@principia/base/util/support/Stack'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { makeEq } from '@principia/base/Eq'
import * as Ev from '@principia/base/Eval'
import { InterruptedException } from '@principia/base/Exception'
import { flow, identity, pipe } from '@principia/base/function'
import * as L from '@principia/base/List'
import * as O from '@principia/base/Option'
import { tuple } from '@principia/base/tuple'
import { makeStack } from '@principia/base/util/support/Stack'

import { eqFiberId } from '../Fiber/FiberId'
import { prettyTrace } from '../Fiber/trace'

export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E> | Traced<E>

export interface Empty {
  readonly _tag: 'Empty'
}

export interface Fail<E> {
  readonly _tag: 'Fail'
  readonly value: E
}

export interface Die {
  readonly _tag: 'Die'
  readonly value: unknown
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

export interface Traced<E> {
  readonly _tag: 'Traced'
  readonly cause: Cause<E>
  readonly trace: Trace
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const empty: Cause<never> = {
  _tag: 'Empty'
}

/**
 */
export function fail<E>(value: E): Cause<E> {
  return {
    _tag: 'Fail',
    value
  }
}

export function traced<E>(cause: Cause<E>, trace: Trace): Cause<E> {
  if (L.isEmpty(trace.executionTrace) && L.isEmpty(trace.stackTrace) && O.isNone(trace.parentTrace)) {
    return cause
  }
  return {
    _tag: 'Traced',
    cause,
    trace
  }
}

/**
 */
export function die(value: unknown): Cause<never> {
  return {
    _tag: 'Die',
    value
  }
}

/**
 */
export function interrupt(fiberId: FiberId): Cause<never> {
  return {
    _tag: 'Interrupt',
    fiberId
  }
}

/**
 */
export function then<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : { _tag: 'Then', left, right }
}

/**
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
 * Returns if the cause has a failure in it
 */
export const failed: <E>(cause: Cause<E>) => boolean = flow(
  failureOption,
  O.map(() => true),
  O.getOrElse(() => false)
)

/**
 */
export function isThen<E>(cause: Cause<E>): cause is Then<E> {
  return cause._tag === 'Then'
}

/**
 */
export function isBoth<E>(cause: Cause<E>): cause is Both<E> {
  return cause._tag === 'Both'
}

/**
 */
export function isEmpty<E>(cause: Cause<E>): boolean {
  if (cause._tag === 'Empty' || (cause._tag === 'Traced' && cause.cause._tag === 'Empty')) {
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
      case 'Interrupt': {
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
      case 'Traced': {
        current = current.cause
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
 * Determines if this cause contains or is equal to the specified cause.
 */
export function contains<E, E1 extends E = E>(that: Cause<E1>): (cause: Cause<E>) => boolean {
  return (cause) =>
    equalsCause(that, cause) ||
    foldl_(cause, false as boolean, (_, c) => (equalsCause(that, c) ? O.Some(true) : O.None()))
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
export function _find<E, A>(cause: Cause<E>, f: (cause: Cause<E>) => O.Option<A>): Ev.Eval<O.Option<A>> {
  const apply = f(cause)
  if (apply._tag === 'Some') {
    return Ev.now(apply)
  }
  switch (cause._tag) {
    case 'Then': {
      return pipe(
        Ev.defer(() => _find(cause.left, f)),
        Ev.bind((isLeft) => {
          if (isLeft._tag === 'Some') {
            return Ev.now(isLeft)
          } else {
            return _find(cause.right, f)
          }
        })
      )
    }
    case 'Both': {
      return pipe(
        Ev.defer(() => _find(cause.left, f)),
        Ev.bind((isLeft) => {
          if (isLeft._tag === 'Some') {
            return Ev.now(isLeft)
          } else {
            return _find(cause.right, f)
          }
        })
      )
    }
    case 'Traced': {
      return Ev.defer(() => _find(cause.cause, f))
    }
    default: {
      return Ev.now(apply)
    }
  }
}

export function find_<E, A>(cause: Cause<E>, f: (cause: Cause<E>) => O.Option<A>): O.Option<A> {
  return _find(cause, f).value
}

/**
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
function _match<E, A>(
  cause: Cause<E>,
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
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
      return Ev.crossWith_(
        Ev.defer(() => _match(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        Ev.defer(() => _match(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        onBoth
      )
    case 'Then':
      return Ev.crossWith_(
        Ev.defer(() => _match(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        Ev.defer(() => _match(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        onThen
      )
    case 'Traced':
      return Ev.map_(
        Ev.defer(() => _match(cause.cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        (a) => onTraced(a, cause.trace)
      )
  }
}

/**
 * Folds over a cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function match_<E, A>(
  cause: Cause<E>,
  onEmpty: () => A,
  onFail: (e: E) => A,
  onDie: (u: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): A {
  return _match(cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced).value
}

/**
 * Folds over a cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function match<E, A>(
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): (cause: Cause<E>) => A {
  return (cause) => _match(cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced).value
}

/**
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
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function foldl<E, A>(a: A, f: (a: A, cause: Cause<E>) => O.Option<A>): (cause: Cause<E>) => A {
  return (cause) => foldl_(cause, a, f)
}

/**
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export function interruptOption<E>(cause: Cause<E>): O.Option<FiberId> {
  return find_(cause, (c) => (c._tag === 'Interrupt' ? O.Some(c.fiberId) : O.None()))
}

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export function failureOption<E>(cause: Cause<E>): O.Option<E> {
  return find_(cause, (c) => (c._tag === 'Fail' ? O.Some(c.value) : O.None()))
}

/**
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export function dieOption<E>(cause: Cause<E>): O.Option<unknown> {
  return find_(cause, (c) => (c._tag === 'Die' ? O.Some(c.value) : O.None()))
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E>(fa: Cause<E>, that: () => Cause<E>): Cause<E> {
  return bind_(fa, () => that())
}

/**
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
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<E, D>(fab: Cause<(a: E) => D>, fa: Cause<E>): Cause<D> {
  return bind_(fab, (f) => map_(fa, f))
}

/**
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
  if (x === y) return true
  let current: readonly [Cause<E>, Cause<E>] | undefined = tuple(x, y)
  let causes: Stack<readonly [Cause<E>, Cause<E>]> | undefined

  while (current) {
    if (current[0]._tag === 'Traced') {
      current = [current[0].cause, current[1]]
      continue
    }
    if (current[1]._tag === 'Traced') {
      current = [current[0], current[1].cause]
      continue
    }
    switch (current[0]._tag) {
      case 'Fail': {
        if (!(current[1]._tag === 'Fail' && current[0].value === current[1].value)) {
          return false
        }
        current = undefined
        break
      }
      case 'Die': {
        if (!(current[1]._tag === 'Die' && current[0].value === current[1].value)) {
          return false
        }
        current = undefined
        break
      }
      case 'Empty': {
        if (!(current[1]._tag === 'Empty')) {
          return false
        }
        current = undefined
        break
      }
      case 'Interrupt': {
        if (!(current[1]._tag === 'Interrupt' && eqFiberId.equals_(current[0].fiberId, current[1].fiberId))) {
          return false
        }
        current = undefined
        break
      }
      case 'Both': {
        if (!(current[1]._tag === 'Both')) {
          return false
        }
        causes  = makeStack([current[0].right, current[1].right], causes)
        current = tuple(current[0].left, current[1].left)
        break
      }
      case 'Then': {
        if (!(current[1]._tag === 'Then')) {
          return false
        }
        causes  = makeStack([current[0].right, current[1].right], causes)
        current = tuple(current[0].left, current[1].left)
        break
      }
    }
    if (!current && causes) {
      current = causes?.value
      causes  = causes?.previous
    }
  }
  return true
}

export const eqCause: Eq<Cause<any>> = makeEq(equalsCause)

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
export function map_<E, D>(fa: Cause<E>, f: (e: E) => D) {
  return bind_(fa, (e) => fail(f(e)))
}

/**
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
function _bind<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Ev.Eval<Cause<D>> {
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
      return Ev.crossWith_(
        Ev.defer(() => _bind(ma.left, f)),
        Ev.defer(() => _bind(ma.right, f)),
        then
      )
    case 'Both':
      return Ev.crossWith_(
        Ev.defer(() => _bind(ma.left, f)),
        Ev.defer(() => _bind(ma.right, f)),
        both
      )
    case 'Traced':
      return Ev.map_(_bind(ma.cause, f), (cause) => traced(cause, ma.trace))
  }
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind_<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Cause<D> {
  return _bind(ma, f).value
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind<E, D>(f: (e: E) => Cause<D>): (ma: Cause<E>) => Cause<D> {
  return (ma) => bind_(ma, f)
}

/**
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
  return foldl_(cause, [] as ReadonlyArray<unknown>, (a, c) => (c._tag === 'Die' ? O.Some([...a, c.value]) : O.None()))
}

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(cause: Cause<E>): ReadonlyArray<E> {
  return foldl_(cause, [] as readonly E[], (a, c) => (c._tag === 'Fail' ? O.Some([...a, c.value]) : O.None()))
}

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export function interruptors<E>(cause: Cause<E>): ReadonlySet<FiberId> {
  return foldl_(cause, new Set(), (s, c) => (c._tag === 'Interrupt' ? O.Some(s.add(c.fiberId)) : O.None()))
}

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function interruptedOnly<E>(cause: Cause<E>): boolean {
  return pipe(
    cause,
    find((c) => (died(c) || failed(c) ? O.Some(false) : O.None())),
    O.getOrElse(() => true)
  )
}

/**
 * @internal
 */
function _stripFailures<E>(cause: Cause<E>): Ev.Eval<Cause<never>> {
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
      return Ev.crossWith_(
        Ev.defer(() => _stripFailures(cause.left)),
        Ev.defer(() => _stripFailures(cause.right)),
        both
      )
    }
    case 'Then': {
      return Ev.crossWith_(
        Ev.defer(() => _stripFailures(cause.left)),
        Ev.defer(() => _stripFailures(cause.right)),
        then
      )
    }
    case 'Traced': {
      return Ev.map_(
        Ev.defer(() => _stripFailures(cause.cause)),
        (c) => traced(c, cause.trace)
      )
    }
  }
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<E>(cause: Cause<E>): Cause<never> {
  return _stripFailures(cause).value
}

/**
 * @internal
 */
export function _stripInterrupts<E>(cause: Cause<E>): Ev.Eval<Cause<E>> {
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
      return Ev.crossWith_(
        Ev.defer(() => _stripInterrupts(cause.left)),
        Ev.defer(() => _stripInterrupts(cause.right)),
        both
      )
    }
    case 'Then': {
      return Ev.crossWith_(
        Ev.defer(() => _stripInterrupts(cause.left)),
        Ev.defer(() => _stripInterrupts(cause.right)),
        then
      )
    }
    case 'Traced': {
      return Ev.map_(
        Ev.defer(() => _stripInterrupts(cause.cause)),
        (c) => traced(c, cause.trace)
      )
    }
  }
}

/**
 * Discards all interrupts kept on this `Cause`.
 */
export function stripInterrupts<E>(cause: Cause<E>): Cause<E> {
  return _stripInterrupts(cause).value
}

function _stripSomeDefects<E>(cause: Cause<E>, pf: Predicate<unknown>): Ev.Eval<O.Option<Cause<E>>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(O.None())
    }
    case 'Interrupt': {
      return Ev.now(O.Some(interrupt(cause.fiberId)))
    }
    case 'Fail': {
      return Ev.now(O.Some(fail(cause.value)))
    }
    case 'Die': {
      return Ev.now(pf(cause.value) ? O.Some(die(cause.value)) : O.None())
    }
    case 'Both': {
      return Ev.crossWith_(
        Ev.defer(() => _stripSomeDefects(cause.left, pf)),
        Ev.defer(() => _stripSomeDefects(cause.right, pf)),
        (left, right) => {
          return left._tag === 'Some'
            ? right._tag === 'Some'
              ? O.Some(both(left.value, right.value))
              : left
            : right._tag === 'Some'
            ? right
            : O.None()
        }
      )
    }
    case 'Then': {
      return Ev.crossWith_(
        Ev.defer(() => _stripSomeDefects(cause.left, pf)),
        Ev.defer(() => _stripSomeDefects(cause.right, pf)),
        (left, right) => {
          return left._tag === 'Some'
            ? right._tag === 'Some'
              ? O.Some(then(left.value, right.value))
              : left
            : right._tag === 'Some'
            ? right
            : O.None()
        }
      )
    }
    case 'Traced': {
      return Ev.map_(
        Ev.defer(() => _stripSomeDefects(cause.cause, pf)),
        O.map((c) => traced(c, cause.trace))
      )
    }
  }
}

export function stripSomeDefects_<E>(cause: Cause<E>, pf: Predicate<unknown>): O.Option<Cause<E>> {
  return _stripSomeDefects(cause, pf).value
}

export function stripSomeDefects(pf: Predicate<unknown>): <E>(cause: Cause<E>) => O.Option<Cause<E>> {
  return (cause) => _stripSomeDefects(cause, pf).value
}

/**
 * @internal
 */
function _keepDefects<E>(cause: Cause<E>): Ev.Eval<O.Option<Cause<never>>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(O.None())
    }
    case 'Fail': {
      return Ev.now(O.None())
    }
    case 'Interrupt': {
      return Ev.now(O.None())
    }
    case 'Die': {
      return Ev.now(O.Some(cause))
    }
    case 'Then': {
      return Ev.crossWith_(
        Ev.defer(() => _keepDefects(cause.left)),
        Ev.defer(() => _keepDefects(cause.right)),
        (lefts, rights) => {
          if (lefts._tag === 'Some' && rights._tag === 'Some') {
            return O.Some(then(lefts.value, rights.value))
          } else if (lefts._tag === 'Some') {
            return lefts
          } else if (rights._tag === 'Some') {
            return rights
          } else {
            return O.None()
          }
        }
      )
    }
    case 'Both': {
      return Ev.crossWith_(
        Ev.defer(() => _keepDefects(cause.left)),
        Ev.defer(() => _keepDefects(cause.right)),
        (lefts, rights) => {
          if (lefts._tag === 'Some' && rights._tag === 'Some') {
            return O.Some(both(lefts.value, rights.value))
          } else if (lefts._tag === 'Some') {
            return lefts
          } else if (rights._tag === 'Some') {
            return rights
          } else {
            return O.None()
          }
        }
      )
    }
    case 'Traced': {
      return Ev.map_(
        Ev.defer(() => _keepDefects(cause.cause)),
        O.map((c) => traced(c, cause.trace))
      )
    }
  }
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export function keepDefects<E>(cause: Cause<E>): O.Option<Cause<never>> {
  return _keepDefects(cause).value
}

function _sequenceCauseEither<E, A>(cause: Cause<E.Either<E, A>>): Ev.Eval<E.Either<Cause<E>, A>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(E.Left(empty))
    }
    case 'Interrupt': {
      return Ev.now(E.Left(cause))
    }
    case 'Fail': {
      return Ev.now(cause.value._tag === 'Left' ? E.Left(fail(cause.value.left)) : E.Right(cause.value.right))
    }
    case 'Die': {
      return Ev.now(E.Left(cause))
    }
    case 'Then': {
      return Ev.crossWith_(
        Ev.defer(() => _sequenceCauseEither(cause.left)),
        Ev.defer(() => _sequenceCauseEither(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Left'
            ? rights._tag === 'Right'
              ? E.Right(rights.right)
              : E.Left(then(lefts.left, rights.left))
            : E.Right(lefts.right)
        }
      )
    }
    case 'Both': {
      return Ev.crossWith_(
        Ev.defer(() => _sequenceCauseEither(cause.left)),
        Ev.defer(() => _sequenceCauseEither(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Left'
            ? rights._tag === 'Right'
              ? E.Right(rights.right)
              : E.Left(both(lefts.left, rights.left))
            : E.Right(lefts.right)
        }
      )
    }
    case 'Traced': {
      return Ev.map_(
        Ev.defer(() => _sequenceCauseEither(cause.cause)),
        E.mapLeft((c) => traced(c, cause.trace))
      )
    }
  }
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEither<E, A>(cause: Cause<E.Either<E, A>>): E.Either<Cause<E>, A> {
  return _sequenceCauseEither(cause).value
}

function _sequenceCauseOption<E>(cause: Cause<O.Option<E>>): Ev.Eval<O.Option<Cause<E>>> {
  switch (cause._tag) {
    case 'Empty': {
      return Ev.now(O.Some(empty))
    }
    case 'Interrupt': {
      return Ev.now(O.Some(cause))
    }
    case 'Fail': {
      return Ev.now(O.map_(cause.value, fail))
    }
    case 'Die': {
      return Ev.now(O.Some(cause))
    }
    case 'Then': {
      return Ev.crossWith_(
        Ev.defer(() => _sequenceCauseOption(cause.left)),
        Ev.defer(() => _sequenceCauseOption(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Some'
            ? rights._tag === 'Some'
              ? O.Some(then(lefts.value, rights.value))
              : lefts
            : rights._tag === 'Some'
            ? rights
            : O.None()
        }
      )
    }
    case 'Both': {
      return Ev.crossWith_(
        Ev.defer(() => _sequenceCauseOption(cause.left)),
        Ev.defer(() => _sequenceCauseOption(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Some'
            ? rights._tag === 'Some'
              ? O.Some(both(lefts.value, rights.value))
              : lefts
            : rights._tag === 'Some'
            ? rights
            : O.None()
        }
      )
    }
    case 'Traced': {
      return Ev.map_(
        Ev.defer(() => _sequenceCauseOption(cause.cause)),
        O.map((c) => traced(c, cause.trace))
      )
    }
  }
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>`.
 */
export function sequenceCauseOption<E>(cause: Cause<O.Option<E>>): O.Option<Cause<E>> {
  return _sequenceCauseOption(cause).value
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
    O.map(E.Left),
    O.getOrElse(() => E.Right(cause as Cause<never>)) // no E inside this cause, can safely cast
  )
}

/**
 * Squashes a `Cause` down to a single `Error`, chosen to be the
 * "most important" `Error`.
 */
export function squash<E>(f: (e: E) => unknown): (cause: Cause<E>) => unknown {
  return (cause) =>
    pipe(
      cause,
      failureOption,
      O.map(f),
      O.alt(() =>
        interrupted(cause)
          ? O.Some<unknown>(
              new InterruptedException(
                'Interrupted by fibers: ' +
                  Array.from(interruptors(cause))
                    .map((_) => _.seqNumber.toString())
                    .map((_) => '#' + _)
                    .join(', ')
              )
            )
          : O.None()
      ),
      O.alt(() => A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException('Interrupted'))
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

type TraceRenderer = (_: Trace) => string

export interface Renderer<E = unknown> {
  renderFailure: (error: E) => string[]
  renderError: (error: Error) => string[]
  renderTrace: TraceRenderer
  renderUnknown: (error: unknown) => string[]
}

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

const renderInterrupt = (fiberId: FiberId, trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([
    Failure([`An interrupt was produced by #${fiberId.seqNumber}.`, '', ...renderTrace(trace, traceRenderer)])
  ])

const renderError = (error: Error): string[] => lines(error.stack ? error.stack : String(error))

const renderDie = (error: string[], trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([Failure(['An unchecked error was produced.', '', ...error, ...renderTrace(trace, traceRenderer)])])

const renderDieUnknown = (error: string[], trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([Failure(['An unchecked error was produced.', '', ...error, ...renderTrace(trace, traceRenderer)])])

const renderFailure = (error: string[], trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([Failure(['A checked error was not handled.', '', ...error, ...renderTrace(trace, traceRenderer)])])

const renderFailError = (error: Error, trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([
    Failure(['A checked error was not handled.', '', ...renderError(error), ...renderTrace(trace, traceRenderer)])
  ])

const renderToString = (u: unknown): string => {
  if (typeof u === 'object' && u != null && 'toString' in u && typeof u['toString'] === 'function') {
    return u['toString']()
  }
  return JSON.stringify(u, null, 2)
}

const causeToSequential = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<Sequential> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case 'Empty': {
        return Sequential([])
      }
      case 'Fail': {
        return cause.value instanceof Error
          ? renderFailure(renderer.renderError(cause.value), O.None(), renderer.renderTrace)
          : renderFailure(renderer.renderFailure(cause.value), O.None(), renderer.renderTrace)
      }
      case 'Die': {
        return cause.value instanceof Error
          ? renderDie(renderer.renderError(cause.value), O.None(), renderer.renderTrace)
          : renderDie(renderer.renderUnknown(cause.value), O.None(), renderer.renderTrace)
      }
      case 'Interrupt': {
        return renderInterrupt(cause.fiberId, O.None(), renderer.renderTrace)
      }
      case 'Then': {
        return Sequential(yield* _(linearSegments(cause, renderer)))
      }
      case 'Both': {
        return Sequential([Parallel(yield* _(parallelSegments(cause, renderer)))])
      }
      case 'Traced': {
        switch (cause.cause._tag) {
          case 'Fail': {
            return renderFailure(renderer.renderFailure(cause.cause.value), O.Some(cause.trace), renderer.renderTrace)
          }
          case 'Die': {
            return renderDie(renderer.renderUnknown(cause.cause.value), O.Some(cause.trace), renderer.renderTrace)
          }
          case 'Interrupt': {
            return renderInterrupt(cause.cause.fiberId, O.Some(cause.trace), renderer.renderTrace)
          }
          default: {
            return Sequential([
              Failure([
                'An error was rethrown with a new trace.',
                ...renderTrace(O.Some(cause.trace), renderer.renderTrace)
              ]),
              ...(yield* _(causeToSequential(cause.cause, renderer))).all
            ])
          }
        }
      }
    }
  })

const linearSegments = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<Step[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case 'Then': {
        return [
          ...(yield* _(linearSegments(cause.left, renderer))),
          ...(yield* _(linearSegments(cause.right, renderer)))
        ]
      }
      default: {
        return (yield* _(causeToSequential(cause, renderer))).all
      }
    }
  })

const parallelSegments = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<Sequential[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case 'Both': {
        return [
          ...(yield* _(parallelSegments(cause.left, renderer))),
          ...(yield* _(parallelSegments(cause.right, renderer)))
        ]
      }
      default: {
        return [yield* _(causeToSequential(cause, renderer))]
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

const prettyLines = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<readonly string[]> =>
  Ev.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, renderer))

    if (s.all.length === 1 && s.all[0]._tag === 'Failure') {
      return s.all[0].lines
    }

    return O.getOrElse_(A.updateAt(0, '╥')(format(s)), (): string[] => [])
  })

function renderTrace(o: O.Option<Trace>, renderTrace: TraceRenderer) {
  return o._tag === 'None' ? [] : lines(renderTrace(o.value))
}

export function prettySafe<E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<string> {
  return Ev.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, renderer))
    return lines.join('\n')
  })
}

const defaultErrorToLines = (error: unknown) =>
  error instanceof Error ? renderError(error) : lines(renderToString(error))

export const defaultRenderer: Renderer = {
  renderError,
  renderTrace: prettyTrace,
  renderUnknown: defaultErrorToLines,
  renderFailure: defaultErrorToLines
}

export function pretty<E>(cause: Cause<E>, renderer: Renderer<E> = defaultRenderer): string {
  return prettySafe(cause, renderer).value
}
