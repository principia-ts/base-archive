import type { Exit } from '../Exit/core'
import type { UIO } from '../IO/core'
import type { Scope } from '../Scope'
import type { FiberId } from './FiberId'
import type { Option } from '@principia/base/Option'

import * as Ev from '@principia/base/Eval'
import { identity } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import * as C from '../Cause/core'
import * as Ex from '../Exit/core'
import { FiberRef } from '../FiberRef/core'
import * as I from '../IO/core'

/**
 * InterruptStatus tracks interruptability of the current stack region
 */
export class InterruptStatus {
  constructor(readonly isInterruptible: boolean) {}

  get isUninteruptible(): boolean {
    return !this.isInterruptible
  }

  get toBoolean(): boolean {
    return this.isInterruptible
  }
}

export const interruptible = new InterruptStatus(true)

export const uninterruptible = new InterruptStatus(false)

export function interruptStatus(b: boolean): InterruptStatus {
  return b ? interruptible : uninterruptible
}

/**
 * A record containing information about a `Fiber`.
 */
export class FiberDescriptor {
  constructor(
    readonly id: FiberId,
    readonly status: FiberStatus,
    readonly interruptors: ReadonlySet<FiberId>,
    readonly interruptStatus: InterruptStatus,
    readonly scope: Scope<Exit<any, any>>
  ) {}
}

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking ZIO effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 */
export type Fiber<E, A> = RuntimeFiber<E, A> | SyntheticFiber<E, A>

export interface CommonFiber<E, A> {
  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  readonly await: UIO<Exit<E, A>>
  /**
   * Gets the value of the fiber ref for this fiber, or the initial value of
   * the fiber ref, if the fiber is not storing the ref.
   */
  readonly getRef: <K>(fiberRef: FiberRef<K>) => UIO<K>
  /**
   * Inherits values from all {@link FiberRef} instances into current fiber.
   * This will resume immediately.
   */
  readonly inheritRefs: UIO<void>
  /**
   * Interrupts the fiber as if interrupted from the specified fiber. If the
   * fiber has already exited, the returned effect will resume immediately.
   * Otherwise, the effect will resume when the fiber exits.
   */
  readonly interruptAs: (fiberId: FiberId) => UIO<Exit<E, A>>
  /**
   * Tentatively observes the fiber, but returns immediately if it is not already done.
   */
  readonly poll: UIO<Option<Exit<E, A>>>
}

export interface RuntimeFiber<E, A> extends CommonFiber<E, A> {
  _tag: 'RuntimeFiber'
  /**
   * The identity of the fiber.
   */
  readonly id: FiberId

  readonly scope: Scope<Exit<E, A>>
  /**
   * The status of the fiber.
   */
  readonly status: UIO<FiberStatus>
}

export interface SyntheticFiber<E, A> extends CommonFiber<E, A> {
  _tag: 'SyntheticFiber'
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * makeSynthetic :: Synthetic e a -> Fiber e a
 * ```
 *
 * A type helper for building a Synthetic Fiber
 */
export function makeSynthetic<E, A>(_: SyntheticFiber<E, A>): Fiber<E, A> {
  return _
}

export function done<E, A>(exit: Exit<E, A>): SyntheticFiber<E, A> {
  return {
    _tag: 'SyntheticFiber',
    await: I.pure(exit),
    getRef: (ref) => I.pure(ref.initial),
    inheritRefs: I.unit(),
    interruptAs: () => I.pure(exit),
    poll: I.pure(O.some(exit))
  }
}

export function succeed<A>(a: A): SyntheticFiber<never, A> {
  return done(Ex.succeed(a))
}

export function fail<E>(e: E): SyntheticFiber<E, never> {
  return done(Ex.fail(e))
}

export function halt<E>(cause: C.Cause<E>) {
  return done(Ex.halt(cause))
}

export function interruptAs(id: FiberId) {
  return done(Ex.interrupt(id))
}

/*
 * -------------------------------------------
 * Folds
 * -------------------------------------------
 */

/**
 * ```haskell
 * _fold :: (
 *    Fiber e a,
 *    ((Runtime e a) -> b),
 *    ((Synthetic e a) -> b)
 * ) -> b
 * ```
 *
 * Folds over the runtime or synthetic fiber.
 */
export function fold_<E, A, B>(
  fiber: Fiber<E, A>,
  onRuntime: (_: RuntimeFiber<E, A>) => B,
  onSynthetic: (_: SyntheticFiber<E, A>) => B
): B {
  switch (fiber._tag) {
    case 'RuntimeFiber': {
      return onRuntime(fiber)
    }
    case 'SyntheticFiber': {
      return onSynthetic(fiber)
    }
  }
}

/**
 * ```haskell
 * fold :: (((Runtime e a) -> b), ((Synthetic e a) -> b)) -> Fiber e a -> b
 * ```
 *
 * Folds over the runtime or synthetic fiber.
 */
export function fold<E, A, B>(
  onRuntime: (_: RuntimeFiber<E, A>) => B,
  onSynthetic: (_: SyntheticFiber<E, A>) => B
): (fiber: Fiber<E, A>) => B {
  return (fiber) => fold_(fiber, onRuntime, onSynthetic)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/*
 * -------------------------------------------
 * Unit Fiber
 * -------------------------------------------
 */

export function unit(): Fiber<never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------
 * FiberState
 * -------------------------------------------
 */

export type FiberState<E, A> = FiberStateExecuting<E, A> | FiberStateDone<E, A>

export type Callback<E, A> = (exit: Exit<E, A>) => void

export class FiberStateExecuting<E, A> {
  readonly _tag = 'Executing'

  constructor(
    readonly status: FiberStatus,
    readonly observers: Callback<never, Exit<E, A>>[],
    readonly interrupted: C.Cause<never>
  ) {}
}

export class FiberStateDone<E, A> {
  readonly _tag = 'Done'

  readonly interrupted         = C.empty
  readonly status: FiberStatus = new Done()

  constructor(readonly value: Exit<E, A>) {}
}

export function initial<E, A>(): FiberState<E, A> {
  return new FiberStateExecuting(new Running(false), [], C.empty)
}

export function interrupting<E, A>(state: FiberState<E, A>): boolean {
  const loop = (status: FiberStatus): Ev.Eval<boolean> =>
    Ev.gen(function* (_) {
      switch (status._tag) {
        case 'Running': {
          return status.interrupting
        }
        case 'Finishing': {
          return status.interrupting
        }
        case 'Suspended': {
          return yield* _(loop(status.previous))
        }
        case 'Done': {
          return false
        }
      }
    })

  return loop(state.status).value()
}

/*
 * -------------------------------------------
 * FiberStatus
 * -------------------------------------------
 */

export type FiberStatus = Done | Finishing | Running | Suspended

export class Done {
  readonly _tag = 'Done'
}

export class Finishing {
  readonly _tag = 'Finishing'

  constructor(readonly interrupting: boolean) {}
}

export class Running {
  readonly _tag = 'Running'

  constructor(readonly interrupting: boolean) {}
}

export class Suspended {
  readonly _tag = 'Suspended'

  constructor(
    readonly previous: FiberStatus,
    readonly interruptible: boolean,
    readonly epoch: number,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {}
}

/**
 * @internal
 */
export function withInterruptingSafe_(s: FiberStatus, b: boolean): Ev.Eval<FiberStatus> {
  return Ev.gen(function* (_) {
    switch (s._tag) {
      case 'Done': {
        return s
      }
      case 'Finishing': {
        return new Finishing(b)
      }
      case 'Running': {
        return new Running(b)
      }
      case 'Suspended': {
        return new Suspended(yield* _(withInterruptingSafe_(s.previous, b)), s.interruptible, s.epoch, s.blockingOn)
      }
    }
  })
}

export function withInterrupting(b: boolean): (s: FiberStatus) => FiberStatus {
  return (s) => withInterruptingSafe_(s, b).value()
}

export function toFinishingSafe(s: FiberStatus): Ev.Eval<FiberStatus> {
  return Ev.gen(function* (_) {
    switch (s._tag) {
      case 'Done': {
        return s
      }
      case 'Finishing': {
        return s
      }
      case 'Running': {
        return s
      }
      case 'Suspended': {
        return yield* _(toFinishingSafe(s.previous))
      }
    }
  })
}

export function toFinishing(s: FiberStatus): FiberStatus {
  return toFinishingSafe(s).value()
}

/*
 * -------------------------------------------
 * FiberDump
 * -------------------------------------------
 */

export interface FiberDump {
  _tag: 'FiberDump'
  fiberId: FiberId
  fiberName: Option<string>
  status: FiberStatus
}

export const FiberDump = (fiberId: FiberId, fiberName: Option<string>, status: FiberStatus): FiberDump => ({
  _tag: 'FiberDump',
  fiberId,
  fiberName,
  status
})

/*
 * -------------------------------------------
 * FiberName
 * -------------------------------------------
 */

export const fiberName = new FiberRef<O.Option<string>>(O.none(), identity, identity)
