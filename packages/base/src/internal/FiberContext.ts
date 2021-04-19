import type { Exit } from '../Exit/core'
import type { Callback, Fiber, InterruptStatus, RuntimeFiber } from '../Fiber/core'
import type { FiberId } from '../Fiber/FiberId'
import type { TraceElement } from '../Fiber/trace'
import type { FiberRef } from '../FiberRef'
import type { Option } from '../Option'
import type { Supervisor } from '../Supervisor'
import type { Stack } from '../util/support/Stack'
import type { Platform } from './Platform'

import { constVoid } from '@principia/prelude/function'

import * as A from '../Array/core'
import * as C from '../Cause/core'
import * as E from '../Either'
import { RuntimeException } from '../Exception'
import * as Ex from '../Exit/core'
import {
  FiberDescriptor,
  FiberStateDone,
  FiberStateExecuting,
  initial,
  interrupting,
  interruptStatus
} from '../Fiber/core'
import * as Status from '../Fiber/core'
import { newFiberId } from '../Fiber/FiberId'
import * as I from '../Fiber/internal/io'
import { IOTag } from '../Fiber/internal/io'
import { SourceLocation, Trace, traceLocation, truncatedParentTrace } from '../Fiber/trace'
import * as FR from '../FiberRef'
import * as L from '../List/core'
import * as O from '../Option'
import * as Scope from '../Scope'
import * as Super from '../Supervisor'
import { AtomicReference } from '../util/support/AtomicReference'
import { RingBuffer } from '../util/support/RingBuffer'
import { makeStack } from '../util/support/Stack'

export type FiberRefLocals = Map<FiberRef<any>, any>

export class TracingExit {
  readonly _tag = 'TracingExit'
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export class InterruptExit {
  readonly _tag = 'InterruptExit'
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export class HandlerFrame {
  readonly _tag = 'HandlerFrame'
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export class ApplyFrame {
  readonly _tag = 'ApplyFrame'
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export type Frame =
  | InterruptExit
  | I.Fold<any, any, any, any, any, any, any, any, any>
  | HandlerFrame
  | ApplyFrame
  | TracingExit

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null)

export function unsafeCurrentFiber(): O.Option<FiberContext<any, any>> {
  return O.fromNullable(currentFiber.get)
}

/**
 * `FiberContext` provides all of the context and facilities required to run a `IO`
 */
export class FiberContext<E, A> implements RuntimeFiber<E, A> {
  readonly _tag = 'RuntimeFiber'

  private readonly state = new AtomicReference(initial<E, A>())

  private mut_asyncEpoch        = 0 | 0
  private mut_scopeKey          = undefined as Scope.Key | undefined
  private mut_stack             = undefined as Stack<Frame> | undefined
  private mut_environments      = makeStack(this.initialEnv) as Stack<any> | undefined
  private mut_interruptStatus   = makeStack(this.initialInterruptStatus.toBoolean) as Stack<boolean> | undefined
  private mut_supervisors       = makeStack(this.initialSupervisor)
  private mut_forkScopeOverride = undefined as Stack<Option<Scope.Scope<Exit<any, any>>>> | undefined
  private executionTraces       = new RingBuffer<TraceElement>(this.platform.executionTraceLength)
  private stackTraces           = new RingBuffer<TraceElement>(this.platform.stackTraceLength)
  private mut_traceStatusStack  = makeStack(true) as Stack<boolean> | undefined
  private traceStatusEnabled    = this.platform.traceExecution || this.platform.traceStack

  constructor(
    protected readonly fiberId: FiberId,
    private readonly initialEnv: any,
    private readonly initialInterruptStatus: InterruptStatus,
    private readonly fiberRefLocals: FiberRefLocals,
    private readonly initialSupervisor: Supervisor<any>,
    private readonly openScope: Scope.Open<Exit<E, A>>,
    private readonly maxOperations: number,
    private readonly reportFailure: (e: C.Cause<E>) => void,
    private readonly platform: Platform<unknown>,
    readonly parentTrace: O.Option<Trace>
  ) {
    this.evaluateNow = this.evaluateNow.bind(this)
  }

  get poll() {
    return I.effectTotal(() => this._poll())
  }

  private addTrace(f: Function) {
    if (this.inTracingRegion && '$trace' in f) {
      this.executionTraces.push(new SourceLocation(f['$trace']))
    }
  }

  private addTraceValue(trace: string | undefined | TraceElement) {
    if (this.inTracingRegion && trace) {
      this.executionTraces.push(typeof trace === 'string' ? new SourceLocation(trace) : trace)
    }
  }

  private tracingExit = new TracingExit((v: any) => {
    this.popTracingStatus()
    return new I.Succeed(v)
  })

  getRef<K>(fiberRef: FR.FiberRef<K>): I.UIO<K> {
    return I.effectTotal(() => this.fiberRefLocals.get(fiberRef) || fiberRef.initial)
  }

  private _poll() {
    const state = this.state.get

    switch (state._tag) {
      case 'Executing': {
        return O.None()
      }
      case 'Done': {
        return O.Some(state.value)
      }
    }
  }

  private interruptExit = new InterruptExit((v: any) => {
    if (this.isInterruptible) {
      this.popInterruptStatus()
      return I.pure(v)[I._I]
    } else {
      return I.effectTotal(() => {
        this.popInterruptStatus()
        return v
      })[I._I]
    }
  })

  get isInterruptible() {
    return this.mut_interruptStatus ? this.mut_interruptStatus.value : false
  }

  get isInterrupted() {
    return !C.isEmpty(this.state.get.interrupted)
  }

  get isInterrupting() {
    return interrupting(this.state.get)
  }

  get shouldInterrupt() {
    return this.isInterrupted && this.isInterruptible && !this.isInterrupting
  }

  get isStackEmpty() {
    return !this.mut_stack
  }

  get inTracingRegion() {
    return (
      this.traceStatusEnabled &&
      (this.mut_traceStatusStack ? this.mut_traceStatusStack.value : this.platform.initialTracingStatus)
    )
  }

  get id() {
    return this.fiberId
  }

  private popTracingStatus() {
    this.mut_traceStatusStack = this.mut_traceStatusStack?.previous
  }

  private pushTracingStatus(flag: boolean) {
    this.mut_traceStatusStack = makeStack(flag, this.mut_traceStatusStack)
  }

  private pushContinuation(k: Frame) {
    if (this.platform.traceStack && this.inTracingRegion) {
      this.stackTraces.push(traceLocation(k.apply))
    }
    this.mut_stack = makeStack(k, this.mut_stack)
  }

  private popContinuation() {
    const current  = this.mut_stack?.value
    this.mut_stack = this.mut_stack?.previous
    return current
  }

  private pushEnv(k: any) {
    this.mut_environments = makeStack(k, this.mut_environments)
  }

  private popEnv() {
    const current         = this.mut_environments?.value
    this.mut_environments = this.mut_environments?.previous
    return current
  }

  private pushInterruptStatus(flag: boolean) {
    this.mut_interruptStatus = makeStack(flag, this.mut_interruptStatus)
  }

  private popInterruptStatus() {
    const current            = this.mut_interruptStatus?.value
    this.mut_interruptStatus = this.mut_interruptStatus?.previous
    return current
  }

  private popStackTrace() {
    this.stackTraces.pop()
  }

  runAsync(k: Callback<E, A>) {
    const v = this.registerObserver((xx) => k(Ex.flatten(xx)))

    if (v) {
      k(v)
    }
  }

  /**
   * Unwinds the stack, looking for the first error handler, and exiting
   * interruptible / uninterruptible regions.
   */
  private unwindStack() {
    let unwinding      = true
    let discardedFolds = false

    // Unwind the stack, looking for an error handler:
    while (unwinding && !this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const frame = this.popContinuation()!

      switch (frame._tag) {
        case 'InterruptExit': {
          this.popInterruptStatus()
          break
        }
        case 'TracingExit': {
          this.popTracingStatus()
          break
        }
        case 'Fold': {
          if (!this.shouldInterrupt) {
            // Push error handler back onto the stack and halt iteration:
            if (this.platform.traceStack && this.inTracingRegion) {
              this.popStackTrace()
            }
            this.pushContinuation(new HandlerFrame(frame.onFailure))
            unwinding = false
          } else {
            if (this.platform.traceStack && this.inTracingRegion) {
              this.popStackTrace()
            }
            discardedFolds = true
          }
          break
        }
        default: {
          if (this.platform.traceStack && this.inTracingRegion) {
            this.popStackTrace()
          }
        }
      }
    }

    return discardedFolds
  }

  private registerObserver(k: Callback<never, Exit<E, A>>): Exit<E, A> | null {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        return oldState.value
      }
      case 'Executing': {
        const observers = [k, ...oldState.observers]

        this.state.set(new FiberStateExecuting(oldState.status, observers, oldState.interrupted))

        return null
      }
    }
  }

  private next(value: any): I.Instruction | undefined {
    if (!this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const k = this.popContinuation()!

      if (this.inTracingRegion && this.platform.traceExecution) {
        this.addTrace(k.apply)
      }
      if (this.platform.traceStack && k._tag !== 'InterruptExit' && k._tag !== 'TracingExit') {
        this.popStackTrace()
      }

      return k.apply(value)[I._I]
    } else {
      return this.done(Ex.succeed(value))?.[I._I]
    }
  }

  private notifyObservers(v: Exit<E, A>, observers: Callback<never, Exit<E, A>>[]) {
    const result = Ex.succeed(v)

    observers.forEach((k) => k(result))
  }

  private observe(k: Callback<never, Exit<E, A>>): Option<I.UIO<Exit<E, A>>> {
    const x = this.registerObserver(k)

    if (x != null) {
      return O.Some(I.pure(x))
    }

    return O.None()
  }

  get await(): I.UIO<Exit<E, A>> {
    return I.effectAsyncInterruptEither(
      (k): E.Either<I.UIO<void>, I.UIO<Exit<E, A>>> => {
        const cb: Callback<never, Exit<E, A>> = (x) => k(I.done(x))
        return O.match_(this.observe(cb), () => E.Left(I.effectTotal(() => this.interruptObserver(cb))), E.Right)
      }
    )
  }

  private interruptObserver(k: Callback<never, Exit<E, A>>) {
    const oldState = this.state.get

    if (oldState._tag === 'Executing') {
      const observers = oldState.observers.filter((o) => o !== k)

      this.state.set(new FiberStateExecuting(oldState.status, observers, oldState.interrupted))
    }
  }

  interruptAs(fiberId: FiberId): I.UIO<Exit<E, A>> {
    const interruptedCause = C.interrupt(fiberId)

    return I.deferTotal(() => {
      const oldState = this.state.get
      if (
        oldState._tag === 'Executing' &&
        oldState.status._tag === 'Suspended' &&
        oldState.status.interruptible &&
        !interrupting(oldState)
      ) {
        const newCause = C.then(oldState.interrupted, interruptedCause)
        this.state.set(
          new FiberStateExecuting(Status.withInterrupting(true)(oldState.status), oldState.observers, newCause)
        )
        this.evaluateLater(I.interruptAs(fiberId)[I._I])
      } else if (oldState._tag === 'Executing') {
        const newCause = C.then(oldState.interrupted, interruptedCause)
        this.state.set(new FiberStateExecuting(oldState.status, oldState.observers, newCause))
      }
      return this.await
    })

    /*
     *       switch (oldState._tag) {
     *         case 'Executing': {
     *           if (oldState.status._tag === 'Suspended' && oldState.status.interruptible && !interrupting(oldState)) {
     *             const newCause = C.then(oldState.interrupted, interruptedCause)
     *
     *             this.state.set(
     *               new FiberStateExecuting(Status.withInterrupting(true)(oldState.status), oldState.observers, newCause)
     *             )
     *
     *             this.evaluateLater(I.interruptAs(this.fiberId)[I._I])
     *
     *             return newCause
     *           } else {
     *             const newCause = C.then(oldState.interrupted, interruptedCause)
     *
     *             this.state.set(new FiberStateExecuting(oldState.status, oldState.observers, newCause))
     *
     *             return newCause
     *           }
     *         }
     *         case 'Done': {
     *           return interruptedCause
     *         }
     *       }
     */
  }

  private done(v: Exit<E, A>): I.Instruction | undefined {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        // Already done
        return undefined
      }
      case 'Executing': {
        if (this.openScope.scope.unsafeClosed) {
          /*
           * We are truly "done" because all the children of this fiber have terminated,
           * and there are no more pending effects that we have to execute on the fiber.
           */
          this.state.set(new FiberStateDone(v))
          this.reportUnhandled(v)
          this.notifyObservers(v, oldState.observers)

          return undefined
        } else {
          /*
           * We are not done yet, because there are children to interrupt, or
           * because there are effects to execute on the fiber.
           */
          this.state.set(
            new FiberStateExecuting(Status.toFinishing(oldState.status), oldState.observers, oldState.interrupted)
          )

          this.setInterrupting(true)

          return I.bind_(this.openScope.close(v), () => I.done(v))[I._I]
        }
      }
    }
  }

  private reportUnhandled(exit: Ex.Exit<E, A>) {
    if (exit._tag === 'Failure') {
      this.reportFailure(exit.cause)
    }
  }

  private setInterrupting(value: boolean): void {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Executing': {
        this.state.set(
          new FiberStateExecuting(
            Status.withInterrupting(value)(oldState.status),
            oldState.observers,
            oldState.interrupted
          )
        )
        return
      }
      case 'Done': {
        return
      }
    }
  }

  private enterAsync(epoch: number, blockingOn: ReadonlyArray<FiberId>): I.Instruction | undefined {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        throw new RuntimeException(`Unexpected fiber completion ${this.fiberId}`)
      }
      case 'Executing': {
        const newState = new FiberStateExecuting(
          new Status.Suspended(oldState.status, this.isInterruptible, epoch, blockingOn),
          oldState.observers,
          oldState.interrupted
        )

        this.state.set(newState)

        if (this.shouldInterrupt) {
          // Fiber interrupted, so go back into running state:
          this.exitAsync(epoch)
          return I.halt(this.state.get.interrupted)[I._I]
        } else {
          return undefined
        }
      }
    }
  }

  private exitAsync(epoch: number): boolean {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        return false
      }
      case 'Executing': {
        if (oldState.status._tag === 'Suspended' && epoch === oldState.status.epoch) {
          this.state.set(new FiberStateExecuting(oldState.status.previous, oldState.observers, oldState.interrupted))
          return true
        } else {
          return false
        }
      }
    }
  }

  private resumeAsync(epoch: number) {
    return (_: I.IO<any, any, any>) => {
      if (this.exitAsync(epoch)) {
        this.evaluateLater(_[I._I])
      }
    }
  }

  evaluateLater(i0: I.Instruction) {
    Promise.resolve(i0).then(this.evaluateNow)
  }

  get scope(): Scope.Scope<Exit<E, A>> {
    return this.openScope.scope
  }

  get status(): I.UIO<Status.FiberStatus> {
    return I.succeed(this.state.get.status)
  }

  private fork(
    i0: I.Instruction,
    forkScope: Option<Scope.Scope<Exit<any, any>>>,
    reportFailure: O.Option<(e: C.Cause<E>) => void>
  ): FiberContext<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map()

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, k.fork(v))
    })

    const parentScope: Scope.Scope<Exit<any, any>> = O.getOrElse_(
      forkScope._tag === 'Some' ? forkScope : this.mut_forkScopeOverride?.value || O.None(),
      () => this.scope
    )

    const currentEnv        = this.mut_environments?.value || {}
    const currentSupervisor = this.mut_supervisors.value
    const childId           = newFiberId()
    const childScope        = Scope.unsafeMakeScope<Exit<E, A>>()
    const ancestry          = this.inTracingRegion && (this.platform.traceExecution || this.platform.traceStack)
        ? O.Some(this.cutAncestryTrace(this.captureTrace(undefined)))
        : O.None()

    const childContext = new FiberContext(
      childId,
      currentEnv,
      interruptStatus(this.isInterruptible),
      childFiberRefLocals,
      currentSupervisor,
      childScope,
      this.maxOperations,
      O.getOrElse_(reportFailure, () => this.reportFailure),
      this.platform,
      ancestry
    )

    if (currentSupervisor !== Super.none) {
      currentSupervisor.unsafeOnStart(currentEnv, i0, O.Some(this), childContext)
      childContext.onDone((exit) => {
        currentSupervisor.unsafeOnEnd(Ex.flatten(exit), childContext)
      })
    }

    const toExecute = this.parentScopeOp(parentScope, childContext, i0)

    Promise.resolve(toExecute).then(childContext.evaluateNow)

    return childContext
  }

  private parentScopeOp(
    parentScope: Scope.Scope<Exit<any, any>>,
    childContext: FiberContext<E, A>,
    i0: I.Instruction
  ): I.Instruction {
    if (parentScope !== Scope.globalScope) {
      const exitOrKey = parentScope.unsafeEnsure((exit) =>
        I.deferTotal(
          (): I.UIO<any> => {
            const _interruptors = exit._tag === 'Failure' ? C.interruptors(exit.cause) : new Set<FiberId>()

            const head = _interruptors.values().next()

            if (head.done) {
              return childContext.interruptAs(this.fiberId)
            } else {
              return childContext.interruptAs(head.value)
            }
          }
        )
      )

      return E.match_(
        exitOrKey,
        (exit) => {
          switch (exit._tag) {
            case 'Failure': {
              return I.interruptAs(O.getOrElse_(A.head(Array.from(C.interruptors(exit.cause))), () => this.fiberId))[
                I._I
              ]
            }
            case 'Success': {
              return I.interruptAs(this.fiberId)[I._I]
            }
          }
        },
        (key) => {
          childContext.mut_scopeKey = key
          // Remove the finalizer key from the parent scope when the child fiber terminates:
          childContext.onDone(() => {
            parentScope.unsafeDeny(key)
          })

          return i0
        }
      )
    } else {
      return i0
    }
  }

  onDone(k: Callback<never, Exit<E, A>>): void {
    const oldState = this.state.get

    switch (oldState._tag) {
      case 'Done': {
        k(Ex.succeed(oldState.value))
        return
      }
      case 'Executing': {
        this.state.set(new FiberStateExecuting(oldState.status, [k, ...oldState.observers], oldState.interrupted))
      }
    }
  }

  private getDescriptor() {
    return new FiberDescriptor(
      this.fiberId,
      this.state.get.status,
      C.interruptors(this.state.get.interrupted),
      interruptStatus(this.isInterruptible),
      this.scope
    )
  }

  private complete<R, R1, R2, E2, A2, R3, E3, A3>(
    winner: Fiber<any, any>,
    loser: Fiber<any, any>,
    cont: (exit: Exit<any, any>, fiber: Fiber<any, any>) => I.IO<any, any, any>,
    winnerExit: Exit<any, any>,
    ab: AtomicReference<boolean>,
    cb: (_: I.IO<R & R1 & R2 & R3, E2 | E3, A2 | A3>) => void
  ): void {
    if (ab.compareAndSet(true, false)) {
      switch (winnerExit._tag) {
        case 'Failure': {
          cb(cont(winnerExit, loser))
          break
        }
        case 'Success': {
          cb(I.bind(() => cont(winnerExit, loser))(winner.inheritRefs))
          break
        }
      }
    }
  }

  get inheritRefs() {
    return I.deferTotal(() => {
      const locals = this.fiberRefLocals
      if (locals.size === 0) {
        return I.unit()
      } else {
        return I.foreachUnit_(locals, ([fiberRef, value]) => FR.update((old) => fiberRef.join(old, value))(fiberRef))
      }
    })
  }

  private raceWithImpl<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    race: I.Race<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
  ): I.IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true)
    const left          = this.fork(race.left[I._I], race.scope, O.Some(constVoid))
    const right         = this.fork(race.right[I._I], race.scope, O.Some(constVoid))

    return I.effectAsync<R & R1 & R2 & R3, E2 | E3, A2 | A3>(
      (cb) => {
        const leftRegister = left.registerObserver((exit) => {
          switch (exit._tag) {
            case 'Failure': {
              this.complete(left, right, race.leftWins, exit, raceIndicator, cb)
              break
            }
            case 'Success': {
              this.complete(left, right, race.leftWins, exit.value, raceIndicator, cb)
              break
            }
          }
        })

        if (leftRegister != null) {
          this.complete(left, right, race.leftWins, leftRegister, raceIndicator, cb)
        } else {
          const rightRegister = right.registerObserver((exit) => {
            switch (exit._tag) {
              case 'Failure': {
                this.complete(right, left, race.rightWins, exit, raceIndicator, cb)
                break
              }
              case 'Success': {
                this.complete(right, left, race.rightWins, exit.value, raceIndicator, cb)
                break
              }
            }
          })

          if (rightRegister != null) {
            this.complete(right, left, race.rightWins, rightRegister, raceIndicator, cb)
          }
        }
      },
      [left.fiberId, right.fiberId]
    )
  }

  captureTrace(last: TraceElement | undefined): Trace {
    const exec   = this.executionTraces.listReverse
    const stack_ = this.stackTraces.listReverse
    const stack  = last ? L.prepend_(stack_, last) : stack_
    return new Trace(this.id, exec, stack, this.parentTrace)
  }

  cutAncestryTrace(trace: Trace): Trace {
    const maxExecLength  = this.platform.ancestorExecutionTraceLength
    const maxStackLength = this.platform.ancestorStackTraceLength
    const maxAncestors   = this.platform.ancestryLength - 1

    const truncated = truncatedParentTrace(trace, maxAncestors)

    return new Trace(
      trace.fiberId,
      L.take_(trace.executionTrace, maxExecLength),
      L.take_(trace.stackTrace, maxStackLength),
      truncated
    )
  }

  fastPathTrace(
    k: any,
    effect: any,
    fastPathFlatMapContinuationTrace: AtomicReference<TraceElement | undefined>
  ): TraceElement | undefined {
    if (this.inTracingRegion) {
      const kTrace = traceLocation(k)

      if (this.platform.traceEffects) {
        this.addTrace(effect)
      }
      if (this.platform.traceStack) {
        fastPathFlatMapContinuationTrace.set(kTrace)
      }
      return kTrace
    }
    return undefined
  }

  /**
   * Begins the `IO` run loop
   */
  evaluateNow(start: I.Instruction): void {
    try {
      let current: I.Instruction | undefined = start
      const fastPathFlatMapContinuationTrace = new AtomicReference<TraceElement | undefined>(undefined)
      currentFiber.set(this)

      while (current != null) {
        try {
          let opCount = 0
          while (current != null) {
            if (!this.shouldInterrupt) {
              if (opCount === this.maxOperations) {
                this.evaluateLater(current)
                current = undefined
              } else {
                switch (current._tag) {
                  case IOTag.Bind: {
                    const nested: I.Instruction              = current.io[I._I]
                    const k: (a: any) => I.IO<any, any, any> = current.f

                    switch (nested._tag) {
                      case IOTag.Succeed: {
                        if (this.platform.traceEffects && this.inTracingRegion) {
                          this.addTraceValue(nested.trace)
                        }
                        if (this.platform.traceExecution && this.inTracingRegion) {
                          this.addTrace(k)
                        }
                        current = k(nested.value)[I._I]
                        break
                      }
                      case IOTag.EffectTotal: {
                        const kTrace = this.fastPathTrace(k, nested.effect, fastPathFlatMapContinuationTrace)
                        if (this.platform.traceExecution && this.inTracingRegion) {
                          this.addTraceValue(kTrace)
                        }
                        if (this.platform.traceStack && kTrace != null) {
                          fastPathFlatMapContinuationTrace.set(undefined)
                        }
                        current = k(nested.effect())[I._I]
                        break
                      }
                      case IOTag.EffectPartial: {
                        const kTrace = this.fastPathTrace(k, nested.effect, fastPathFlatMapContinuationTrace)
                        try {
                          if (this.platform.traceStack && kTrace != null) {
                            fastPathFlatMapContinuationTrace.set(undefined)
                          }
                          if (this.platform.traceExecution && this.inTracingRegion && kTrace != null) {
                            this.addTraceValue(kTrace)
                          }
                          current = k(nested.effect())[I._I]
                        } catch (e) {
                          if (this.platform.traceExecution && this.inTracingRegion) {
                            this.addTrace(nested.onThrow)
                          }
                          current = I.fail(nested.onThrow(e))[I._I]
                        }
                        break
                      }
                      default: {
                        current = nested
                        this.pushContinuation(new ApplyFrame(k))
                      }
                    }
                    break
                  }

                  case IOTag.SetTracingStatus: {
                    if (this.inTracingRegion) {
                      this.pushTracingStatus(current.flag)
                      this.mut_stack = makeStack(this.tracingExit, this.mut_stack)
                    }
                    current = current.effect[I._I]
                    break
                  }

                  case IOTag.GetTracingStatus: {
                    current = current.f(this.inTracingRegion)[I._I]
                    break
                  }

                  case IOTag.GetTrace: {
                    current = this.next(this.captureTrace(undefined))
                    break
                  }

                  case IOTag.FFI: {
                    current = current[I._I]
                    break
                  }

                  case IOTag.Succeed: {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTraceValue(current.trace)
                    }
                    current = this.next(current.value)
                    break
                  }

                  case IOTag.EffectTotal: {
                    if (this.platform.traceEffects) {
                      this.addTrace(current.effect)
                    }
                    current = this.next(current.effect())
                    break
                  }

                  case IOTag.Fail: {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTrace(current.fill)
                    }

                    const fast = fastPathFlatMapContinuationTrace.get
                    fastPathFlatMapContinuationTrace.set(undefined)

                    const fullCause      = current.fill(() => this.captureTrace(fast))
                    const discardedFolds = this.unwindStack()

                    const maybeRedactedCause = discardedFolds ? C.stripFailures(fullCause) : fullCause

                    if (this.isStackEmpty) {
                      const cause = () => {
                        const interrupted       = this.state.get.interrupted
                        const causeAndInterrupt = C.contains(interrupted)(maybeRedactedCause)
                          ? maybeRedactedCause
                          : C.then(maybeRedactedCause, interrupted)
                        return causeAndInterrupt
                      }
                      this.setInterrupting(true)

                      current = this.done(Ex.halt(cause()))
                    } else {
                      this.setInterrupting(false)
                      current = this.next(maybeRedactedCause)
                    }
                    break
                  }

                  case IOTag.Fold: {
                    this.pushContinuation(current)
                    current = current.io[I._I]
                    break
                  }

                  case IOTag.SetInterrupt: {
                    this.pushInterruptStatus(current.flag.toBoolean)
                    this.pushContinuation(this.interruptExit)
                    current = current.io[I._I]
                    break
                  }

                  case IOTag.GetInterrupt: {
                    current = current.f(interruptStatus(this.isInterruptible))[I._I]
                    break
                  }

                  case IOTag.EffectPartial: {
                    const c = current
                    try {
                      if (this.inTracingRegion && this.platform.traceEffects) {
                        this.addTrace(c.effect)
                      }
                      current = this.next(c.effect())
                    } catch (e) {
                      current = I.fail(c.onThrow(e))[I._I]
                    }
                    break
                  }

                  case IOTag.Async: {
                    const epoch         = this.mut_asyncEpoch
                    this.mut_asyncEpoch = epoch + 1
                    const c             = current
                    current             = this.enterAsync(epoch, c.blockingOn)

                    if (!current) {
                      const onResolve = c.register
                      const h         = onResolve(this.resumeAsync(epoch))
                      if (this.platform.traceEffects && this.inTracingRegion) {
                        this.addTrace(onResolve)
                      }

                      switch (h._tag) {
                        case 'None': {
                          current = undefined
                          break
                        }
                        case 'Some': {
                          if (this.exitAsync(epoch)) {
                            current = h.value[I._I]
                          } else {
                            current = undefined
                          }
                        }
                      }
                    }

                    break
                  }

                  case IOTag.Fork: {
                    current = this.next(this.fork(current.io[I._I], current.scope, current.reportFailure))
                    break
                  }

                  case IOTag.CheckDescriptor: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = current.f(this.getDescriptor())[I._I]
                    break
                  }

                  case IOTag.Yield: {
                    current = undefined
                    this.evaluateLater(I.unit()[I._I])
                    break
                  }

                  case IOTag.Read: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f)
                    }
                    current = current.f(this.mut_environments?.value || {})[I._I]
                    break
                  }

                  case IOTag.Give: {
                    const c = current
                    current = I.bracket_(
                      I.effectTotal(() => {
                        this.pushEnv(c.env)
                      }),
                      () => c.io,
                      () =>
                        I.effectTotal(() => {
                          this.popEnv()
                        })
                    )[I._I]
                    break
                  }

                  case IOTag.DeferTotal: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.io)
                    }
                    current = current.io()[I._I]
                    break
                  }

                  case IOTag.DeferPartial: {
                    const c = current

                    try {
                      if (this.platform.traceExecution && this.inTracingRegion) {
                        this.addTrace(current.io)
                      }
                      current = c.io()[I._I]
                    } catch (e) {
                      if (this.platform.traceExecution && this.inTracingRegion) {
                        this.addTrace(c.onThrow)
                      }
                      current = I.fail(c.onThrow(e))[I._I]
                    }

                    break
                  }

                  case IOTag.NewFiberRef: {
                    const fiberRef = new FR.FiberRef(current.initial, current.onFork, current.onJoin)

                    this.fiberRefLocals.set(fiberRef, current.initial)

                    current = this.next(fiberRef)

                    break
                  }

                  case IOTag.ModifyFiberRef: {
                    const c                  = current
                    const oldValue           = O.fromNullable(this.fiberRefLocals.get(c.fiberRef))
                    const [result, newValue] = current.f(O.getOrElse_(oldValue, () => c.fiberRef.initial))
                    this.fiberRefLocals.set(c.fiberRef, newValue)
                    current = this.next(result)
                    break
                  }

                  case IOTag.GetPlatform: {
                    current = current.f(this.platform)[I._I]
                    break
                  }

                  case IOTag.Race: {
                    current = this.raceWithImpl(current)[I._I]
                    break
                  }

                  case IOTag.Supervise: {
                    const c              = current
                    const lastSupervisor = this.mut_supervisors.value
                    const newSupervisor  = c.supervisor.and(lastSupervisor)
                    current              = I.bracket_(
                      I.effectTotal(() => {
                        this.mut_supervisors = makeStack(newSupervisor, this.mut_supervisors)
                      }),
                      () => c.io,
                      () =>
                        I.effectTotal(() => {
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          this.mut_supervisors = this.mut_supervisors.previous!
                        })
                    )[I._I]
                    break
                  }

                  case IOTag.GetForkScope: {
                    current = current.f(O.getOrElse_(this.mut_forkScopeOverride?.value || O.None(), () => this.scope))[
                      I._I
                    ]
                    break
                  }

                  case IOTag.OverrideForkScope: {
                    const c = current
                    current = I.bracket_(
                      I.effectTotal(() => {
                        this.mut_forkScopeOverride = makeStack(c.forkScope, this.mut_forkScopeOverride)
                      }),
                      () => c.io,
                      () =>
                        I.effectTotal(() => {
                          this.mut_forkScopeOverride = this.mut_forkScopeOverride?.previous
                        })
                    )[I._I]
                    break
                  }
                }
              }
            } else {
              current = I.halt(this.state.get.interrupted)[I._I]
              this.setInterrupting(true)
            }
            opCount++
          }
        } catch (e) {
          this.setInterrupting(true)
          current = I.die(e)[I._I]
        }
      }
    } finally {
      currentFiber.set(null)
    }
  }
}
