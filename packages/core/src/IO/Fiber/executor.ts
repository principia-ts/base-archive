/**
 * tracing: off
 */
import * as A from "../../Array/_core";
import * as E from "../../Either";
import { constVoid } from "../../Function";
import * as L from "../../List/_core";
import type { Option } from "../../Option";
import { none } from "../../Option";
import * as O from "../../Option";
import type { Stack } from "../../Utils/Stack";
import { stack } from "../../Utils/Stack";
import { AtomicReference } from "../../Utils/support/AtomicReference";
import { RingBuffer } from "../../Utils/support/RingBuffer";
import { defaultScheduler } from "../../Utils/support/Scheduler";
import * as C from "../Cause";
import * as Ex from "../Exit";
import type { Exit } from "../Exit/model";
import type { FiberRef } from "../FiberRef";
import * as FR from "../FiberRef";
import * as Scope from "../Scope";
import type { Supervisor } from "../Supervisor";
import * as Super from "../Supervisor";
import * as I from "./_internal/io";
import { IOInstructionTag } from "./_internal/io";
import type { FiberId } from "./FiberId";
import { newFiberId } from "./FiberId";
import type { Fiber, InterruptStatus, RuntimeFiber } from "./model";
import { FiberDescriptor, interruptStatus } from "./model";
import type { Platform } from "./platform";
import type { Callback } from "./state";
import { FiberStateDone, FiberStateExecuting, initial, interrupting } from "./state";
import * as Status from "./status";
import type { TraceElement } from "./tracing";
import { SourceLocation, Trace, traceLocation, truncatedParentTrace } from "./tracing";

export type FiberRefLocals = Map<FiberRef<any>, any>;

export class InterruptExit {
  readonly _tag = "InterruptExit";
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export class TracingExit {
  readonly _tag = "TracingExit";
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export class HandlerFrame {
  readonly _tag = "HandlerFrame";
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export class ApplyFrame {
  readonly _tag = "ApplyFrame";
  constructor(readonly apply: (a: any) => I.IO<any, any, any>) {}
}

export type Frame =
  | InterruptExit
  | TracingExit
  | I.FoldInstruction<any, any, any, any, any, any, any, any, any>
  | HandlerFrame
  | ApplyFrame;

export class TracingContext {
  readonly running = new Set<Executor<any, any>>();
  readonly interval = new AtomicReference<NodeJS.Timeout | undefined>(undefined);

  readonly trace = (fiber: Executor<any, any>) => {
    if (!this.running.has(fiber)) {
      if (typeof this.interval.get === "undefined") {
        this.interval.set(
          setInterval(() => {
            // this keeps the process alive if there is something running
          }, 60000)
        );
      }

      this.running.add(fiber);

      fiber.onDone(() => {
        this.running.delete(fiber);

        if (this.running.size === 0) {
          const ci = this.interval.get;

          if (ci) {
            clearInterval(ci);
          }
        }
      });
    }
  };
}

export const _tracing = new TracingContext();

export const currentFiber = new AtomicReference<Executor<any, any> | null>(null);

export function unsafeCurrentFiber(): O.Option<Executor<any, any>> {
  return O.fromNullable(currentFiber.get);
}

/**
 * `Executor` provides all of the context and facilities required to run a `IO`
 */
export class Executor<E, A> implements RuntimeFiber<E, A> {
  readonly _tag = "RuntimeFiber";
  private readonly state = new AtomicReference(initial<E, A>());
  private readonly scheduler = defaultScheduler;

  private asyncEpoch = 0 | 0;
  private continuationFrames?: Stack<Frame> = undefined;
  private environments?: Stack<any> = stack(this.initialEnv);
  private interruptStatus?: Stack<boolean> = stack(this.initialInterruptStatus.toBoolean);
  private supervisors: Stack<Supervisor<any>> = stack(this.initialSupervisor);
  private forkScopeOverride?: Stack<Option<Scope.Scope<Exit<any, any>>>> = undefined;
  private scopeKey: Scope.Key | undefined = undefined;
  private executionTraces = new RingBuffer<TraceElement>(this.platform.executionTraceLength);
  private stackTraces = new RingBuffer<TraceElement>(this.platform.stackTraceLength);
  private traceStatusStack: Stack<boolean> | undefined = stack(true);
  private traceStatusEnabled = this.platform.traceExecution || this.platform.traceStack;

  constructor(
    private readonly fiberId: FiberId,
    private readonly initialEnv: any,
    private readonly initialInterruptStatus: InterruptStatus,
    private readonly fiberRefLocals: FiberRefLocals,
    private readonly initialSupervisor: Supervisor<any>,
    private readonly openScope: Scope.Open<Exit<E, A>>,
    private readonly maxOperations: number,
    private readonly reportFailure: (e: C.Cause<E>) => void,
    private readonly platform: Platform,
    private readonly parentTrace: O.Option<Trace>
  ) {
    _tracing.trace(this);
  }

  get poll() {
    return I.total(() => this._poll());
  }

  addTrace(f: Function) {
    if (this.inTracingRegion && "$trace" in f) {
      this.executionTraces.push(new SourceLocation(f["$trace"]));
    }
  }

  addTraceValue(trace: TraceElement) {
    if (this.inTracingRegion) {
      this.executionTraces.push(trace);
    }
  }

  getRef<K>(fiberRef: FR.FiberRef<K>): I.UIO<K> {
    return I.total(() => this.fiberRefLocals.get(fiberRef) || fiberRef.initial);
  }

  private _poll() {
    const state = this.state.get;

    switch (state._tag) {
      case "Executing": {
        return O.none();
      }
      case "Done": {
        return O.some(state.value);
      }
    }
  }

  private interruptExit = new InterruptExit((v: any) => {
    if (this.isInterruptible) {
      this.popInterruptStatus();
      return I.pure(v)[I._I];
    } else {
      return I.total(() => {
        this.popInterruptStatus();
        return v;
      })[I._I];
    }
  });

  private popTracingStatus() {
    this.traceStatusStack = this.traceStatusStack?.previous;
  }

  private pushTracingStatus(flag: boolean) {
    this.traceStatusStack = stack(flag, this.traceStatusStack);
  }

  private tracingExit = new TracingExit((v: any) => {
    this.popTracingStatus();
    return I.succeed(v);
  });

  get isInterruptible() {
    return this.interruptStatus ? this.interruptStatus.value : true;
  }

  get isInterrupted() {
    return !C.isEmpty(this.state.get.interrupted);
  }

  get isInterrupting() {
    return interrupting(this.state.get);
  }

  get shouldInterrupt() {
    return this.isInterrupted && this.isInterruptible && !this.isInterrupting;
  }

  get isStackEmpty() {
    return !this.continuationFrames;
  }

  get inTracingRegion() {
    return (
      this.traceStatusEnabled &&
      (this.traceStatusStack ? this.traceStatusStack.value : this.platform.initialTracingStatus)
    );
  }

  get id() {
    return this.fiberId;
  }

  private pushContinuation(k: Frame) {
    if (this.platform.traceStack && this.inTracingRegion) {
      this.stackTraces.push(traceLocation(k.apply));
    }
    this.continuationFrames = stack(k, this.continuationFrames);
  }

  private popStackTrace() {
    this.stackTraces.pop();
  }

  private popContinuation() {
    const current = this.continuationFrames?.value;
    this.continuationFrames = this.continuationFrames?.previous;
    return current;
  }

  private pushEnv(k: any) {
    this.environments = stack(k, this.environments);
  }

  private popEnv() {
    const current = this.environments?.value;
    this.environments = this.environments?.previous;
    return current;
  }

  private pushInterruptStatus(flag: boolean) {
    this.interruptStatus = stack(flag, this.interruptStatus);
  }

  private popInterruptStatus() {
    const current = this.interruptStatus?.value;
    this.interruptStatus = this.interruptStatus?.previous;
    return current;
  }

  runAsync(k: Callback<E, A>) {
    const v = this.registerObserver((xx) => k(Ex.flatten(xx)));

    if (v) {
      k(v);
    }
  }

  /**
   * Unwinds the stack, looking for the first error handler, and exiting
   * interruptible / uninterruptible regions.
   */
  private unwindStack() {
    let unwinding = true;
    let discardedFolds = false;

    // Unwind the stack, looking for an error handler:
    while (unwinding && !this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const frame = this.popContinuation()!;

      switch (frame._tag) {
        case "InterruptExit": {
          this.popInterruptStatus();
          break;
        }
        case "TracingExit": {
          this.popTracingStatus();
          break;
        }
        case "Fold": {
          if (!this.shouldInterrupt) {
            // Push error handler back onto the stack and halt iteration:
            if (this.platform.traceStack && this.inTracingRegion) {
              this.popStackTrace();
            }
            this.pushContinuation(new HandlerFrame(frame.onFailure));
            unwinding = false;
          } else {
            if (this.platform.traceStack && this.inTracingRegion) {
              this.popStackTrace();
            }
            discardedFolds = true;
          }
          break;
        }
        default: {
          if (this.platform.traceStack && this.inTracingRegion) {
            this.popStackTrace();
          }
        }
      }
    }

    return discardedFolds;
  }

  private registerObserver(k: Callback<never, Exit<E, A>>): Exit<E, A> | null {
    const oldState = this.state.get;

    switch (oldState._tag) {
      case "Done": {
        return oldState.value;
      }
      case "Executing": {
        const observers = [k, ...oldState.observers];

        this.state.set(new FiberStateExecuting(oldState.status, observers, oldState.interrupted));

        return null;
      }
    }
  }

  private next(value: any): I.Instruction | undefined {
    if (!this.isStackEmpty) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const k = this.popContinuation()!;

      if (this.inTracingRegion && this.platform.traceExecution) {
        this.addTrace(k.apply);
      }
      if (this.platform.traceStack && k._tag !== "InterruptExit" && k._tag !== "TracingExit") {
        this.popStackTrace();
      }

      return k.apply(value)[I._I];
    } else {
      return this.done(Ex.succeed(value))?.[I._I];
    }
  }

  private notifyObservers(v: Exit<E, A>, observers: Callback<never, Exit<E, A>>[]) {
    const result = Ex.succeed(v);

    observers.forEach((k) => k(result));
  }

  private observe(k: Callback<never, Exit<E, A>>): Option<I.UIO<Exit<E, A>>> {
    const x = this.registerObserver(k);

    if (x != null) {
      return O.some(I.pure(x));
    }

    return O.none();
  }

  get await(): I.UIO<Exit<E, A>> {
    return I.maybeAsyncInterrupt(
      (k): E.Either<I.UIO<void>, I.UIO<Exit<E, A>>> => {
        const cb: Callback<never, Exit<E, A>> = (x) => k(I.done(x));
        return O.fold_(
          this.observe(cb),
          () => E.left(I.total(() => this.interruptObserver(cb))),
          E.right
        );
      }
    );
  }

  private interruptObserver(k: Callback<never, Exit<E, A>>) {
    const oldState = this.state.get;

    if (oldState._tag === "Executing") {
      const observers = oldState.observers.filter((o) => o !== k);

      this.state.set(new FiberStateExecuting(oldState.status, observers, oldState.interrupted));
    }
  }

  private kill(fiberId: FiberId): I.UIO<Exit<E, A>> {
    const interruptedCause = C.interrupt(fiberId);

    const setInterruptedLoop = (): C.Cause<never> => {
      const oldState = this.state.get;

      switch (oldState._tag) {
        case "Executing": {
          if (
            oldState.status._tag === "Suspended" &&
            oldState.status.interruptible &&
            !interrupting(oldState)
          ) {
            const newCause = C.then(oldState.interrupted, interruptedCause);

            this.state.set(
              new FiberStateExecuting(
                Status.withInterrupting(true)(oldState.status),
                oldState.observers,
                newCause
              )
            );

            this.evaluateLater(I.interruptAs(this.fiberId)[I._I]);

            return newCause;
          } else {
            const newCause = C.then(oldState.interrupted, interruptedCause);

            this.state.set(new FiberStateExecuting(oldState.status, oldState.observers, newCause));

            return newCause;
          }
        }
        case "Done": {
          return interruptedCause;
        }
      }
    };

    return I.suspend(() => {
      setInterruptedLoop();

      return this.await;
    });
  }

  interruptAs(fiberId: FiberId): I.UIO<Exit<E, A>> {
    return this.kill(fiberId);
  }

  private done(v: Exit<E, A>): I.Instruction | undefined {
    const oldState = this.state.get;

    switch (oldState._tag) {
      case "Done": {
        // Already done
        return undefined;
      }
      case "Executing": {
        if (this.openScope.scope.unsafeClosed) {
          /*
           * We are truly "done" because all the children of this fiber have terminated,
           * and there are no more pending effects that we have to execute on the fiber.
           */
          this.state.set(new FiberStateDone(v));
          this.reportUnhandled(v);
          this.notifyObservers(v, oldState.observers);

          return undefined;
        } else {
          /*
           * We are not done yet, because there are children to interrupt, or
           * because there are effects to execute on the fiber.
           */
          this.state.set(
            new FiberStateExecuting(
              Status.toFinishing(oldState.status),
              oldState.observers,
              oldState.interrupted
            )
          );

          this.setInterrupting(true);

          return I.chain_(this.openScope.close(v), () => I.done(v))[I._I];
        }
      }
    }
  }

  private reportUnhandled(exit: Ex.Exit<E, A>) {
    if (exit._tag === "Failure") {
      this.reportFailure(exit.cause);
    }
  }

  private setInterrupting(value: boolean): void {
    const oldState = this.state.get;

    switch (oldState._tag) {
      case "Executing": {
        this.state.set(
          new FiberStateExecuting(
            Status.withInterrupting(value)(oldState.status),
            oldState.observers,
            oldState.interrupted
          )
        );
        return;
      }
      case "Done": {
        return;
      }
    }
  }

  private enterAsync(epoch: number, blockingOn: ReadonlyArray<FiberId>): I.Instruction | undefined {
    const oldState = this.state.get;

    switch (oldState._tag) {
      case "Done": {
        throw new C.RuntimeError(`Unexpected fiber completion ${this.fiberId}`);
      }
      case "Executing": {
        const newState = new FiberStateExecuting(
          new Status.Suspended(oldState.status, this.isInterruptible, epoch, blockingOn),
          oldState.observers,
          oldState.interrupted
        );

        this.state.set(newState);

        if (this.shouldInterrupt) {
          // Fiber interrupted, so go back into running state:
          this.exitAsync(epoch);
          return I.halt(this.state.get.interrupted)[I._I];
        } else {
          return undefined;
        }
      }
    }
  }

  private exitAsync(epoch: number): boolean {
    const oldState = this.state.get;

    switch (oldState._tag) {
      case "Done": {
        return false;
      }
      case "Executing": {
        if (oldState.status._tag === "Suspended" && epoch === oldState.status.epoch) {
          this.state.set(
            new FiberStateExecuting(
              oldState.status.previous,
              oldState.observers,
              oldState.interrupted
            )
          );
          return true;
        } else {
          return false;
        }
      }
    }
  }

  private resumeAsync(epoch: number) {
    return (_: I.IO<any, any, any>) => {
      if (this.exitAsync(epoch)) {
        this.evaluateLater(_[I._I]);
      }
    };
  }

  evaluateLater(i0: I.Instruction) {
    this.scheduler.dispatchLater(() => {
      this.evaluateNow(i0);
    });
  }

  get scope(): Scope.Scope<Exit<E, A>> {
    return this.openScope.scope;
  }

  get status(): I.UIO<Status.FiberStatus> {
    return I.succeed(this.state.get.status);
  }

  private fork(
    i0: I.Instruction,
    forkScope: Option<Scope.Scope<Exit<any, any>>>,
    reportFailure: O.Option<(e: C.Cause<E>) => void>
  ): Executor<any, any> {
    const childFiberRefLocals: FiberRefLocals = new Map();

    this.fiberRefLocals.forEach((v, k) => {
      childFiberRefLocals.set(k, k.fork(v));
    });

    const parentScope: Scope.Scope<Exit<any, any>> = O.getOrElse_(
      O.alt_(forkScope, () => this.forkScopeOverride?.value || O.none()),
      () => this.scope
    );

    const currentEnv = this.environments?.value || {};
    const currentSupervisor = this.supervisors.value;
    const childId = newFiberId();
    const childScope = Scope.unsafeMakeScope<Exit<E, A>>();
    const ancestry =
      this.inTracingRegion && (this.platform.traceExecution || this.platform.traceStack)
        ? O.some(this.cutAncestryTrace(this.captureTrace(undefined)))
        : O.none();

    const childContext = new Executor(
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
    );

    if (currentSupervisor !== Super.none) {
      currentSupervisor.unsafeOnStart(currentEnv, i0, O.some(this), childContext);
      childContext.onDone((exit) => {
        currentSupervisor.unsafeOnEnd(Ex.flatten(exit), childContext);
      });
    }

    const toExecute = this.parentScopeOp(parentScope, childContext, i0);

    this.scheduler.dispatchLater(() => {
      childContext.evaluateNow(toExecute);
    });

    return childContext;
  }

  private parentScopeOp(
    parentScope: Scope.Scope<Exit<any, any>>,
    childContext: Executor<E, A>,
    i0: I.Instruction
  ): I.Instruction {
    if (parentScope !== Scope.globalScope) {
      const exitOrKey = parentScope.unsafeEnsure((exit) =>
        I.suspend(
          (): I.UIO<any> => {
            const _interruptors =
              exit._tag === "Failure" ? C.interruptors(exit.cause) : new Set<FiberId>();

            const head = _interruptors.values().next();

            if (head.done) {
              return childContext.interruptAs(this.fiberId);
            } else {
              return childContext.interruptAs(head.value);
            }
          }
        )
      );

      return E.fold_(
        exitOrKey,
        (exit) => {
          switch (exit._tag) {
            case "Failure": {
              return I.interruptAs(
                O.getOrElse_(A.head(Array.from(C.interruptors(exit.cause))), () => this.fiberId)
              )[I._I];
            }
            case "Success": {
              return I.interruptAs(this.fiberId)[I._I];
            }
          }
        },
        (key) => {
          childContext.scopeKey = key;
          // Remove the finalizer key from the parent scope when the child fiber terminates:
          childContext.onDone(() => {
            parentScope.unsafeDeny(key);
          });

          return i0;
        }
      );
    } else {
      return i0;
    }
  }

  onDone(k: Callback<never, Exit<E, A>>): void {
    const oldState = this.state.get;

    switch (oldState._tag) {
      case "Done": {
        k(Ex.succeed(oldState.value));
        return;
      }
      case "Executing": {
        this.state.set(
          new FiberStateExecuting(oldState.status, [k, ...oldState.observers], oldState.interrupted)
        );
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
    );
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
        case "Failure": {
          cb(cont(winnerExit, loser));
          break;
        }
        case "Success": {
          cb(I.chain(() => cont(winnerExit, loser))(winner.inheritRefs));
          break;
        }
      }
    }
  }

  get inheritRefs() {
    return I.suspend(() => {
      const locals = this.fiberRefLocals;
      if (locals.size === 0) {
        return I.unit();
      } else {
        return I.foreachUnit_(locals, ([fiberRef, value]) =>
          FR.update((old) => fiberRef.join(old, value))(fiberRef)
        );
      }
    });
  }

  private raceWithImpl<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    race: I.RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
  ): I.IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
    const raceIndicator = new AtomicReference(true);
    const left = this.fork(race.left[I._I], race.scope, O.some(constVoid));
    const right = this.fork(race.right[I._I], race.scope, O.some(constVoid));

    return I.async<R & R1 & R2 & R3, E2 | E3, A2 | A3>(
      (cb) => {
        const leftRegister = left.registerObserver((exit) => {
          switch (exit._tag) {
            case "Failure": {
              this.complete(left, right, race.leftWins, exit, raceIndicator, cb);
              break;
            }
            case "Success": {
              this.complete(left, right, race.leftWins, exit.value, raceIndicator, cb);
              break;
            }
          }
        });

        if (leftRegister != null) {
          this.complete(left, right, race.leftWins, leftRegister, raceIndicator, cb);
        } else {
          const rightRegister = right.registerObserver((exit) => {
            switch (exit._tag) {
              case "Failure": {
                this.complete(right, left, race.rightWins, exit, raceIndicator, cb);
                break;
              }
              case "Success": {
                this.complete(right, left, race.rightWins, exit.value, raceIndicator, cb);
                break;
              }
            }
          });

          if (rightRegister != null) {
            this.complete(right, left, race.rightWins, rightRegister, raceIndicator, cb);
          }
        }
      },
      [left.fiberId, right.fiberId]
    );
  }

  captureTrace(last: TraceElement | undefined): Trace {
    const exec = this.executionTraces.listReverse;
    const stack_ = this.stackTraces.listReverse;
    const stack = last ? L.prepend_(stack_, last) : stack_;
    return new Trace(this.id, exec, stack, this.parentTrace);
  }

  cutAncestryTrace(trace: Trace): Trace {
    const maxExecLength = this.platform.ancestorExecutionTraceLength;
    const maxStackLength = this.platform.ancestorStackTraceLength;
    const maxAncestors = this.platform.ancestryLength - 1;

    const truncated = truncatedParentTrace(trace, maxAncestors);

    return new Trace(
      trace.fiberId,
      L.take_(trace.executionTrace, maxExecLength),
      L.take_(trace.stackTrace, maxStackLength),
      truncated
    );
  }

  fastPathTrace(
    k: any,
    effect: any,
    fastPathFlatMapContinuationTrace: AtomicReference<TraceElement | undefined>
  ): TraceElement | undefined {
    if (this.inTracingRegion) {
      const kTrace = traceLocation(k);

      if (this.platform.traceEffects) {
        this.addTrace(effect);
      }
      if (this.platform.traceStack) {
        fastPathFlatMapContinuationTrace.set(kTrace);
      }
      return kTrace;
    }
    return undefined;
  }

  /**
   * Begins the `IO` run loop
   */
  evaluateNow(start: I.Instruction): void {
    try {
      let current: I.Instruction | undefined = start;

      const fastPathChainContinuationTrace = new AtomicReference<TraceElement | undefined>(
        undefined
      );

      currentFiber.set(this);

      while (current != null) {
        try {
          let opCount = 0;
          while (current != null) {
            if (!this.shouldInterrupt) {
              if (opCount === this.maxOperations) {
                this.evaluateLater(current);
                current = undefined;
              } else {
                switch (current._tag) {
                  case IOInstructionTag.Chain: {
                    const nested: I.Instruction = current.io[I._I];
                    const c = current;
                    const continuation: (a: any) => I.IO<any, any, any> = current.f;

                    switch (nested._tag) {
                      case IOInstructionTag.Succeed: {
                        if (this.platform.traceEffects && this.inTracingRegion && nested.trace) {
                          this.addTraceValue(new SourceLocation(nested.trace));
                        }
                        if (this.platform.traceExecution && this.inTracingRegion) {
                          this.addTrace(continuation);
                        }
                        current = continuation(nested.value)[I._I];
                        break;
                      }
                      case IOInstructionTag.Total: {
                        const kTrace = this.fastPathTrace(
                          continuation,
                          nested.thunk,
                          fastPathChainContinuationTrace
                        );
                        if (this.platform.traceStack && kTrace != null) {
                          fastPathChainContinuationTrace.set(undefined);
                        }
                        if (
                          this.platform.traceExecution &&
                          this.inTracingRegion &&
                          kTrace != null
                        ) {
                          this.addTraceValue(kTrace);
                        }
                        current = continuation(nested.thunk())[I._I];
                        break;
                      }
                      case IOInstructionTag.Partial: {
                        const kTrace = this.fastPathTrace(
                          continuation,
                          nested.thunk,
                          fastPathChainContinuationTrace
                        );
                        try {
                          if (this.platform.traceStack && kTrace != null) {
                            fastPathChainContinuationTrace.set(undefined);
                          }
                          if (
                            this.platform.traceExecution &&
                            this.inTracingRegion &&
                            kTrace != null
                          ) {
                            this.addTraceValue(kTrace);
                          }
                          current = continuation(nested.thunk())[I._I];
                        } catch (e) {
                          if (this.platform.traceExecution && this.inTracingRegion) {
                            this.addTrace(nested.onThrow);
                          }
                          current = I.fail(nested.onThrow(e))[I._I];
                        }
                        break;
                      }
                      default: {
                        current = nested;
                        this.pushContinuation(new ApplyFrame(continuation));
                      }
                    }
                    break;
                  }

                  case IOInstructionTag.Integration: {
                    current = current[I._I];
                    break;
                  }

                  case IOInstructionTag.SetTracingStatus: {
                    if (this.inTracingRegion) {
                      this.pushTracingStatus(current.flag);
                      this.continuationFrames = stack(this.tracingExit, this.continuationFrames);
                    }
                    current = current.io[I._I];
                    break;
                  }

                  case IOInstructionTag.GetTracingStatus: {
                    current = current.f(this.inTracingRegion)[I._I];
                    break;
                  }

                  case IOInstructionTag.Trace: {
                    current = this.next(this.captureTrace(undefined));
                    break;
                  }

                  case IOInstructionTag.Succeed: {
                    current = this.next(current.value);
                    break;
                  }

                  case IOInstructionTag.Total: {
                    if (this.platform.traceEffects) {
                      this.addTrace(current.thunk);
                    }
                    current = this.next(current.thunk());
                    break;
                  }

                  case IOInstructionTag.Fail: {
                    if (this.platform.traceEffects && this.inTracingRegion) {
                      this.addTrace(current.fill);
                    }

                    const fast = fastPathChainContinuationTrace.get;
                    fastPathChainContinuationTrace.set(undefined);
                    const discardedFolds = this.unwindStack();
                    const fullCause = current.fill(() => this.captureTrace(fast));

                    const maybeRedactedCause = discardedFolds
                      ? C.stripFailures(fullCause)
                      : fullCause;

                    if (this.isStackEmpty) {
                      const cause = () => {
                        const interrupted = this.state.get.interrupted;
                        const causeAndInterrupt = C.contains(interrupted)(maybeRedactedCause)
                          ? maybeRedactedCause
                          : C.then(maybeRedactedCause, interrupted);
                        return causeAndInterrupt;
                      };
                      this.setInterrupting(true);

                      current = this.done(Ex.failure(cause()));
                    } else {
                      this.setInterrupting(false);
                      current = this.next(maybeRedactedCause);
                    }
                    break;
                  }

                  case IOInstructionTag.Fold: {
                    this.pushContinuation(current);
                    current = current.io[I._I];
                    break;
                  }

                  case IOInstructionTag.SetInterrupt: {
                    this.pushInterruptStatus(current.flag.toBoolean);
                    this.pushContinuation(this.interruptExit);
                    current = current.io[I._I];
                    break;
                  }

                  case IOInstructionTag.GetInterrupt: {
                    current = current.f(interruptStatus(this.isInterruptible))[I._I];
                    break;
                  }

                  case IOInstructionTag.Partial: {
                    const c = current;
                    try {
                      if (this.inTracingRegion && this.platform.traceEffects) {
                        this.addTrace(c.thunk);
                      }
                      current = this.next(c.thunk());
                    } catch (e) {
                      if (this.inTracingRegion && this.platform.traceEffects) {
                        this.addTrace(c.onThrow);
                      }
                      current = I.fail(c.onThrow(e))[I._I];
                    }
                    break;
                  }

                  case IOInstructionTag.Async: {
                    const epoch = this.asyncEpoch;
                    this.asyncEpoch = epoch + 1;
                    const c = current;
                    current = this.enterAsync(epoch, c.blockingOn);

                    if (!current) {
                      const onResolve = c.register;
                      const h = onResolve(this.resumeAsync(epoch));

                      switch (h._tag) {
                        case "None": {
                          current = undefined;
                          break;
                        }
                        case "Some": {
                          if (this.exitAsync(epoch)) {
                            current = h.value[I._I];
                          } else {
                            current = undefined;
                          }
                        }
                      }
                    }

                    break;
                  }

                  case IOInstructionTag.Fork: {
                    current = this.next(
                      this.fork(current.io[I._I], current.scope, current.reportFailure)
                    );
                    break;
                  }

                  case IOInstructionTag.CheckDescriptor: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f);
                    }
                    current = current.f(this.getDescriptor())[I._I];
                    break;
                  }

                  case IOInstructionTag.Yield: {
                    current = undefined;
                    this.evaluateLater(I.unit()[I._I]);
                    break;
                  }

                  case IOInstructionTag.Read: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f);
                    }
                    current = current.f(this.environments?.value || {})[I._I];
                    break;
                  }

                  case IOInstructionTag.Give: {
                    const c = current;
                    current = I.bracket_(
                      I.total(() => {
                        this.pushEnv(c.env);
                      }),
                      () => c.io,
                      () =>
                        I.total(() => {
                          this.popEnv();
                        })
                    )[I._I];
                    break;
                  }

                  case IOInstructionTag.Suspend: {
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.factory);
                    }
                    current = current.factory()[I._I];
                    break;
                  }

                  case IOInstructionTag.SuspendPartial: {
                    const c = current;

                    try {
                      if (this.platform.traceExecution && this.inTracingRegion) {
                        this.addTrace(current.factory);
                      }
                      current = c.factory()[I._I];
                    } catch (e) {
                      if (this.platform.traceExecution && this.inTracingRegion) {
                        this.addTrace(c.onThrow);
                      }
                      current = I.fail(c.onThrow(e))[I._I];
                    }

                    break;
                  }

                  case IOInstructionTag.NewFiberRef: {
                    const fiberRef = new FR.FiberRef(
                      current.initial,
                      current.onFork,
                      current.onJoin
                    );

                    this.fiberRefLocals.set(fiberRef, current.initial);

                    current = this.next(fiberRef);

                    break;
                  }

                  case IOInstructionTag.ModifyFiberRef: {
                    const c = current;
                    const oldValue = O.fromNullable(this.fiberRefLocals.get(c.fiberRef));
                    if (this.platform.traceExecution && this.inTracingRegion) {
                      this.addTrace(current.f);
                    }
                    const [result, newValue] = current.f(
                      O.getOrElse_(oldValue, () => c.fiberRef.initial)
                    );
                    this.fiberRefLocals.set(c.fiberRef, newValue);
                    current = this.next(result);
                    break;
                  }

                  case IOInstructionTag.Race: {
                    current = this.raceWithImpl(current)[I._I];
                    break;
                  }

                  case IOInstructionTag.Supervise: {
                    const c = current;
                    const lastSupervisor = this.supervisors.value;
                    const newSupervisor = c.supervisor.and(lastSupervisor);
                    current = I.bracket_(
                      I.total(() => {
                        this.supervisors = stack(newSupervisor, this.supervisors);
                      }),
                      () => c.io,
                      () =>
                        I.total(() => {
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          this.supervisors = this.supervisors.previous!;
                        })
                    )[I._I];
                    break;
                  }

                  case IOInstructionTag.GetForkScope: {
                    current = current.f(
                      O.getOrElse_(this.forkScopeOverride?.value || none(), () => this.scope)
                    )[I._I];
                    break;
                  }

                  case IOInstructionTag.OverrideForkScope: {
                    const c = current;
                    current = I.bracket_(
                      I.total(() => {
                        this.forkScopeOverride = stack(c.forkScope, this.forkScopeOverride);
                      }),
                      () => c.io,
                      () =>
                        I.total(() => {
                          this.forkScopeOverride = this.forkScopeOverride?.previous;
                        })
                    )[I._I];
                    break;
                  }
                }
              }
            } else {
              current = I.halt(this.state.get.interrupted)[I._I];
              this.setInterrupting(true);
            }
            opCount++;
          }
        } catch (e) {
          this.setInterrupting(true);
          current = I.die(e)[I._I];
        }
      }
    } finally {
      currentFiber.set(null);
    }
  }
}
