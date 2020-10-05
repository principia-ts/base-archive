import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import { Maybe, nothing } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import * as C from "../Cause";
import * as Ex from "../Exit/core";
import * as FR from "../FiberRef";
import * as Scope from "../Scope";
import { Stack } from "../Stack";
import * as Super from "../Supervisor";
import { Supervisor } from "../Supervisor";
import { AtomicReference, defaultScheduler } from "../Support";
import * as X from "../XPure";
import * as T from "./_internal/effect";
import * as F from "./core";
import { fiberId as makeFiberId } from "./FiberId";
import type { Callback, FiberRefLocals } from "./state";
import { FiberStateDone, FiberStateExecuting, initial, interrupting } from "./state";
import * as Status from "./status";

export class InterruptExit {
   readonly _tag = "InterruptExit";
   constructor(readonly apply: (a: any) => T.Effect<any, any, any>) {}
}

export class HandlerFrame {
   readonly _tag = "HandlerFrame";
   constructor(readonly apply: (a: any) => T.Effect<any, any, any>) {}
}

export class ApplyFrame {
   readonly _tag = "ApplyFrame";
   constructor(readonly apply: (a: any) => T.Effect<any, any, any>) {}
}

export type Frame =
   | InterruptExit
   | T.FoldInstruction<any, any, any, any, any, any, any, any, any>
   | HandlerFrame
   | ApplyFrame;

export class TracingContext {
   readonly running = new Set<FiberContext<any, any>>();
   readonly interval = new AtomicReference<NodeJS.Timeout | undefined>(undefined);

   readonly trace = (fiber: FiberContext<any, any>) => {
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

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null);

export class FiberContext<E, A> implements F.Runtime<E, A> {
   readonly _tag = "RuntimeFiber";
   readonly state = new AtomicReference(initial<E, A>());
   readonly scheduler = defaultScheduler;

   asyncEpoch = 0 | 0;
   stack?: Stack<Frame> = undefined;
   environments?: Stack<any> = new Stack(this.startEnv);
   interruptStatus?: Stack<boolean> = new Stack(this.startIStatus.toBoolean);
   supervisors: Stack<Supervisor<any>> = new Stack(this.supervisor0);
   forkScopeOverride?: Stack<Maybe<Scope.Scope<Ex.Exit<any, any>>>> = undefined;
   scopeKey: Scope.Key | undefined = undefined;

   constructor(
      readonly fiberId: F.FiberId,
      readonly startEnv: any,
      readonly startIStatus: F.InterruptStatus,
      readonly fiberRefLocals: FiberRefLocals,
      readonly supervisor0: Supervisor<any>,
      readonly openScope: Scope.Open<Ex.Exit<E, A>>,
      readonly mapOp: number
   ) {
      _tracing.trace(this);
   }

   get poll() {
      return T.total(() => this.poll0());
   }

   getRef<K>(fiberRef: FR.FiberRef<K>): T.UIO<K> {
      return T.total(() => this.fiberRefLocals.get(fiberRef) || fiberRef.initial);
   }

   poll0() {
      const state = this.state.get;

      switch (state._tag) {
         case "Executing": {
            return Mb.nothing();
         }
         case "Done": {
            return Mb.just(state.value);
         }
      }
   }

   interruptExit = new InterruptExit((v: any) => {
      if (this.isInterruptible) {
         this.popInterruptStatus();
         return T.pure(v)[T._I];
      } else {
         return T.total(() => {
            this.popInterruptStatus();
            return v;
         })[T._I];
      }
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
      return !this.stack;
   }

   get id() {
      return this.fiberId;
   }

   pushContinuation(k: Frame) {
      this.stack = new Stack(k, this.stack);
   }

   popContinuation() {
      const current = this.stack?.value;
      this.stack = this.stack?.previous;
      return current;
   }

   pushEnv(k: any) {
      this.environments = new Stack(k, this.environments);
   }

   popEnv() {
      const current = this.environments?.value;
      this.environments = this.environments?.previous;
      return current;
   }

   pushInterruptStatus(flag: boolean) {
      this.interruptStatus = new Stack(flag, this.interruptStatus);
   }

   popInterruptStatus() {
      const current = this.interruptStatus?.value;
      this.interruptStatus = this.interruptStatus?.previous;
      return current;
   }

   runAsync(k: Callback<E, A>) {
      const v = this.register0((xx) => k(Ex.flatten(xx)));

      if (v) {
         k(v);
      }
   }

   /**
    * Unwinds the stack, looking for the first error handler, and exiting
    * interruptible / uninterruptible regions.
    */
   unwindStack() {
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
            case "Fold": {
               if (!this.shouldInterrupt) {
                  // Push error handler back onto the stack and halt iteration:
                  this.pushContinuation(new HandlerFrame(frame.onFailure));
                  unwinding = false;
               } else {
                  discardedFolds = true;
               }
               break;
            }
         }
      }

      return discardedFolds;
   }

   register0(k: Callback<never, Ex.Exit<E, A>>): Ex.Exit<E, A> | null {
      const oldState = this.state.get;

      switch (oldState._tag) {
         case "Done": {
            return oldState.value;
         }
         case "Executing": {
            const observers = [k, ...oldState.observers];

            this.state.set(
               new FiberStateExecuting(oldState.status, observers, oldState.interrupted)
            );

            return null;
         }
      }
   }

   nextInstr(value: any): T.Instruction | undefined {
      if (!this.isStackEmpty) {
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const k = this.popContinuation()!;

         return k.apply(value)[T._I];
      } else {
         return this.done(Ex.succeed(value))?.[T._I];
      }
   }

   notifyObservers(v: Ex.Exit<E, A>, observers: Callback<never, Ex.Exit<E, A>>[]) {
      const result = Ex.succeed(v);

      observers.forEach((k) => k(result));
   }

   observe0(k: Callback<never, Ex.Exit<E, A>>): Maybe<T.UIO<Ex.Exit<E, A>>> {
      const x = this.register0(k);

      if (x != null) {
         return Mb.just(T.pure(x));
      }

      return Mb.nothing();
   }

   get await(): T.UIO<Ex.Exit<E, A>> {
      return T.maybeAsyncInterrupt(
         (k): E.Either<T.UIO<void>, T.UIO<Ex.Exit<E, A>>> => {
            const cb: Callback<never, Ex.Exit<E, A>> = (x) => k(T.done(x));
            return Mb._fold(
               this.observe0(cb),
               () => E.left(T.total(() => this.interruptObserver(cb))),
               E.right
            );
         }
      );
   }

   interruptObserver(k: Callback<never, Ex.Exit<E, A>>) {
      const oldState = this.state.get;

      if (oldState._tag === "Executing") {
         const observers = oldState.observers.filter((o) => o !== k);

         this.state.set(new FiberStateExecuting(oldState.status, observers, oldState.interrupted));
      }
   }

   kill0(fiberId: F.FiberId): T.UIO<Ex.Exit<E, A>> {
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

                  this.evaluateLater(F.interruptAs(this.fiberId)[T._I]);

                  return newCause;
               } else {
                  const newCause = C.then(oldState.interrupted, interruptedCause);

                  this.state.set(
                     new FiberStateExecuting(oldState.status, oldState.observers, newCause)
                  );

                  return newCause;
               }
            }
            case "Done": {
               return interruptedCause;
            }
         }
      };

      return T.suspend(() => {
         setInterruptedLoop();

         return this.await;
      });
   }

   interruptAs(fiberId: F.FiberId): T.UIO<Ex.Exit<E, A>> {
      return this.kill0(fiberId);
   }

   done(v: Ex.Exit<E, A>): T.Instruction | undefined {
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

               return T._chain(this.openScope.close(v), () => T.done(v))[T._I];
            }
         }
      }
   }

   setInterrupting(value: boolean): void {
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

   enterAsync(epoch: number, blockingOn: ReadonlyArray<F.FiberId>): T.Instruction | undefined {
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
               return T.halt(this.state.get.interrupted)[T._I];
            } else {
               return undefined;
            }
         }
      }
   }

   exitAsync(epoch: number): boolean {
      const oldState = this.state.get;

      switch (oldState._tag) {
         case "Done": {
            return false;
         }
         case "Executing": {
            if (oldState.status._tag === "Suspended" && epoch === oldState.status.epoch) {
               this.state.set(
                  new FiberStateExecuting(oldState.status, oldState.observers, oldState.interrupted)
               );
               return true;
            } else {
               return false;
            }
         }
      }
   }

   resumeAsync(epoch: number) {
      return (_: T.Effect<any, any, any>) => {
         if (this.exitAsync(epoch)) {
            this.evaluateLater(_[T._I]);
         }
      };
   }

   evaluateLater(i0: T.Instruction) {
      this.scheduler.dispatchLater(() => {
         this.evaluateNow(i0);
      });
   }

   get scope(): Scope.Scope<Ex.Exit<E, A>> {
      return this.openScope.scope;
   }

   fork(
      i0: T.Instruction,
      forkScope: Maybe<Scope.Scope<Ex.Exit<any, any>>>
   ): FiberContext<any, any> {
      const childFiberRefLocals: FiberRefLocals = new Map();

      this.fiberRefLocals.forEach((v, k) => {
         childFiberRefLocals.set(k, k.fork(v));
      });

      const parentScope: Scope.Scope<Ex.Exit<any, any>> = Mb._getOrElse(
         Mb._alt(forkScope, () => this.forkScopeOverride?.value || Mb.nothing()),
         () => this.scope
      );

      const currentEnv = this.environments?.value || {};
      const currentSup = this.supervisors.value;
      const childId = makeFiberId();
      const childScope = Scope.unsafeMakeScope<Ex.Exit<E, A>>();

      const childContext = new FiberContext(
         childId,
         currentEnv,
         F.interruptStatus(this.isInterruptible),
         childFiberRefLocals,
         currentSup,
         childScope,
         this.mapOp
      );

      if (currentSup !== Super.none) {
         currentSup.unsafeOnStart(currentEnv, i0, Mb.just(this), childContext);
         childContext.onDone((exit) => {
            currentSup.unsafeOnEnd(Ex.flatten(exit), childContext);
         });
      }

      const toExecute = this.parentScopeOp(parentScope, childContext, i0);

      this.scheduler.dispatchLater(() => {
         childContext.evaluateNow(toExecute);
      });

      return childContext;
   }

   private parentScopeOp(
      parentScope: Scope.Scope<Ex.Exit<any, any>>,
      childContext: FiberContext<E, A>,
      i0: T.Instruction
   ): T.Instruction {
      if (parentScope !== Scope.globalScope) {
         const exitOrKey = parentScope.unsafeEnsure((exit) =>
            T.suspend(
               (): T.UIO<any> => {
                  const _interruptors =
                     exit._tag === "Failure" ? C.interruptors(exit.cause) : new Set<F.FiberId>();

                  const head = _interruptors.values().next();

                  if (head.done) {
                     return childContext.interruptAs(this.fiberId);
                  } else {
                     return childContext.interruptAs(head.value);
                  }
               }
            )
         );

         return E._fold(
            exitOrKey,
            (exit) => {
               switch (exit._tag) {
                  case "Failure": {
                     return T.interruptAs(
                        Mb._getOrElse(
                           A.head(Array.from(C.interruptors(exit.cause))),
                           () => this.fiberId
                        )
                     )[T._I];
                  }
                  case "Success": {
                     return T.interruptAs(this.fiberId)[T._I];
                  }
               }
            },
            (key) => {
               childContext.scopeKey = key;
               // Remove the finalizer key from the parent scope when the child fiber
               // terminates:
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

   onDone(k: Callback<never, Ex.Exit<E, A>>): void {
      const oldState = this.state.get;

      switch (oldState._tag) {
         case "Done": {
            k(Ex.succeed(oldState.value));
            return;
         }
         case "Executing": {
            this.state.set(
               new FiberStateExecuting(
                  oldState.status,
                  [k, ...oldState.observers],
                  oldState.interrupted
               )
            );
         }
      }
   }

   getDescriptor() {
      return new F.FiberDescriptor(
         this.fiberId,
         this.state.get.status,
         C.interruptors(this.state.get.interrupted),
         F.interruptStatus(this.isInterruptible),
         this.scope
      );
   }

   complete<R, R1, R2, E2, A2, R3, E3, A3>(
      winner: F.Fiber<any, any>,
      loser: F.Fiber<any, any>,
      cont: (exit: Ex.Exit<any, any>, fiber: F.Fiber<any, any>) => T.Effect<any, any, any>,
      winnerExit: Ex.Exit<any, any>,
      ab: AtomicReference<boolean>,
      cb: (_: T.Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3>) => void
   ): void {
      if (ab.compareAndSet(true, false)) {
         switch (winnerExit._tag) {
            case "Failure": {
               cb(cont(winnerExit, loser));
               break;
            }
            case "Success": {
               cb(T.chain(() => cont(winnerExit, loser))(winner.inheritRefs));
               break;
            }
         }
      }
   }

   get inheritRefs() {
      return T.suspend(() => {
         const locals = this.fiberRefLocals;
         if (locals.size === 0) {
            return T.unit;
         } else {
            return T._foreachUnit(locals, ([fiberRef, value]) =>
               FR.update((old) => fiberRef.join(old, value))(fiberRef)
            );
         }
      });
   }

   raceWithImpl<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
      race: T.RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
   ): T.Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
      const raceIndicator = new AtomicReference(true);
      const left = this.fork(race.left[T._I], race.scope);
      const right = this.fork(race.right[T._I], race.scope);

      return T.async<R & R1 & R2 & R3, E2 | E3, A2 | A3>(
         (cb) => {
            const leftRegister = left.register0((exit) => {
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
               const rightRegister = right.register0((exit) => {
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

   evaluateNow(i0: T.Instruction): void {
      try {
         // eslint-disable-next-line prefer-const
         let current: T.Instruction | undefined = i0;

         currentFiber.set(this);

         while (current != null) {
            try {
               let opCount = 0;
               while (current != null) {
                  // Check to see if the fiber should continue executing or not:
                  if (!this.shouldInterrupt) {
                     if (opCount === this.mapOp) {
                        this.evaluateLater(current);
                        current = undefined;
                     } else {
                        switch (current._tag) {
                           case "Chain": {
                              const nested: T.Instruction = current.ma[T._I];
                              const k: (a: any) => T.Effect<any, any, any> = current.f;

                              switch (nested._tag) {
                                 case "Pure": {
                                    current = k(nested.value)[T._I];
                                    break;
                                 }
                                 case "Total": {
                                    current = k(nested.thunk())[T._I];
                                    break;
                                 }
                                 case "Partial": {
                                    try {
                                       current = k(nested.thunk())[T._I];
                                    } catch (e) {
                                       current = T.fail(nested.onThrow(e))[T._I];
                                    }
                                    break;
                                 }
                                 /*
                                  * case "XPure": {
                                  *    const res: E.Either<any, any> = X.runEither(
                                  *       X._provideAll(nested, this.environments?.value || {})
                                  *    );
                                  *    console.log(res);
                                  *    if (res._tag === "Left") {
                                  *       current = T.fail(res.left)[T._I];
                                  *    } else {
                                  *       current = this.nextInstr(res.right);
                                  *    }
                                  *    break;
                                  * }
                                  */
                                 default: {
                                    current = nested;
                                    this.pushContinuation(new ApplyFrame(k));
                                 }
                              }
                              break;
                           }

                           case "XPure": {
                              const res: E.Either<any, any> = X.runEither(
                                 X._provideAll(current, this.environments?.value || {})
                              );
                              if (res._tag === "Left") {
                                 current = T.fail(res.left)[T._I];
                              } else {
                                 current = this.nextInstr(res.right);
                              }
                              break;
                           }

                           case "Pure": {
                              current = this.nextInstr(current.value);
                              break;
                           }

                           case "Total": {
                              current = this.nextInstr(current.thunk());
                              break;
                           }

                           case "Fail": {
                              const discardedFolds = this.unwindStack();
                              const fullCause = current.C;

                              const maybeRedactedCause = discardedFolds
                                 ? // We threw away some error handlers while unwinding the stack because
                                   // we got interrupted during this instruction. So it's not safe to return
                                   // typed failures from cause0, because they might not be typed correctly.
                                   // Instead, we strip the typed failures, and return the remainders and
                                   // the interruption.
                                   C.stripFailures(fullCause)
                                 : fullCause;

                              if (this.isStackEmpty) {
                                 // Error not caught, stack is empty:
                                 const cause = () => {
                                    const interrupted = this.state.get.interrupted;
                                    const causeAndInterrupt = C.contains(interrupted)(
                                       maybeRedactedCause
                                    )
                                       ? maybeRedactedCause
                                       : C.then(maybeRedactedCause, interrupted);

                                    return causeAndInterrupt;
                                 };

                                 this.setInterrupting(true);

                                 current = this.done(Ex.failure(cause()));
                              } else {
                                 this.setInterrupting(false);

                                 // Error caught, next continuation on the stack will deal
                                 // with it, so we just have to compute it here:
                                 current = this.nextInstr(maybeRedactedCause);
                              }

                              break;
                           }

                           case "Fold": {
                              this.pushContinuation(current);
                              current = current.fa[T._I];
                              break;
                           }

                           case "ChangeInterruptStatus": {
                              this.pushInterruptStatus(current.flag.toBoolean);
                              this.pushContinuation(this.interruptExit);
                              current = current.E[T._I];
                              break;
                           }

                           case "CheckInterrupt": {
                              current = current.f(F.interruptStatus(this.isInterruptible))[T._I];
                              break;
                           }

                           case "Partial": {
                              const c = current;
                              try {
                                 current = this.nextInstr(c.thunk());
                              } catch (e) {
                                 current = T.fail(c.onThrow(e))[T._I];
                              }
                              break;
                           }

                           case "Async": {
                              const epoch = this.asyncEpoch;
                              this.asyncEpoch = epoch + 1;
                              const c = current;
                              current = this.enterAsync(epoch, c.blockingOn);

                              if (!current) {
                                 const k = c.register;
                                 const h = k(this.resumeAsync(epoch));

                                 switch (h._tag) {
                                    case "Nothing": {
                                       current = undefined;
                                       break;
                                    }
                                    case "Just": {
                                       if (this.exitAsync(epoch)) {
                                          current = h.value[T._I];
                                       } else {
                                          current = undefined;
                                       }
                                    }
                                 }
                              }

                              break;
                           }

                           case "Fork": {
                              current = this.nextInstr(this.fork(current.E[T._I], current.scope));
                              break;
                           }

                           case "CheckDescriptor": {
                              current = current.f(this.getDescriptor())[T._I];
                              break;
                           }

                           case "Yield": {
                              current = undefined;
                              this.evaluateLater(T.unit[T._I]);
                              break;
                           }

                           case "Read": {
                              current = current.f(this.environments?.value || {})[T._I];
                              break;
                           }

                           case "Provide": {
                              const c = current;
                              current = T._bracket(
                                 T.total(() => {
                                    this.pushEnv(c.env);
                                 }),
                                 () => c.fa,
                                 () =>
                                    T.total(() => {
                                       this.popEnv();
                                    })
                              )[T._I];
                              break;
                           }

                           case "Suspend": {
                              current = current.factory()[T._I];
                              break;
                           }

                           case "SuspendPartial": {
                              const c = current;

                              try {
                                 current = c.factory()[T._I];
                              } catch (e) {
                                 current = T.fail(c.onThrow(e))[T._I];
                              }

                              break;
                           }

                           case "NewFiberRef": {
                              const fiberRef = FR.fiberRef(
                                 current.initial,
                                 current.onFork,
                                 current.onJoin
                              );

                              this.fiberRefLocals.set(fiberRef, current.initial);

                              current = this.nextInstr(fiberRef);

                              break;
                           }

                           case "ModifyFiberRef": {
                              const c = current;
                              const oldValue = Mb.fromNullable(this.fiberRefLocals.get(c.fiberRef));
                              const [result, newValue] = current.f(
                                 Mb._getOrElse(oldValue, () => c.fiberRef.initial)
                              );
                              this.fiberRefLocals.set(c.fiberRef, newValue);
                              current = this.nextInstr(result);
                              break;
                           }

                           case "Race": {
                              current = this.raceWithImpl(current)[T._I];
                              break;
                           }

                           case "Supervise": {
                              const c = current;
                              const lastSupervisor = this.supervisors.value;
                              const newSupervisor = c.supervisor.and(lastSupervisor);
                              const push = T.total(() => {
                                 this.supervisors = new Stack(newSupervisor, this.supervisors);
                              });
                              const pop = T.total(() => {
                                 // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                 this.supervisors = this.supervisors.previous!;
                              });
                              current = T._bracket(
                                 push,
                                 () => c.E,
                                 () => pop
                              )[T._I];
                              break;
                           }

                           case "GetForkScope": {
                              const c = current;
                              current = c.f(
                                 Mb._getOrElse(
                                    this.forkScopeOverride?.value || nothing(),
                                    () => this.scope
                                 )
                              )[T._I];
                              break;
                           }

                           case "OverrideForkScope": {
                              const c = current;

                              const push = T.total(() => {
                                 this.forkScopeOverride = new Stack(
                                    c.forkScope,
                                    this.forkScopeOverride
                                 );
                              });

                              const pop = T.total(() => {
                                 this.forkScopeOverride = this.forkScopeOverride?.previous;
                              });

                              current = T._bracket(
                                 push,
                                 () => c.E,
                                 () => pop
                              )[T._I];

                              break;
                           }
                        }
                     }
                  } else {
                     current = T.halt(this.state.get.interrupted)[T._I];
                     this.setInterrupting(true);
                  }

                  opCount++;
               }
            } catch (e) {
               this.setInterrupting(true);
               current = T.die(e)[T._I];
            }
         }
      } finally {
         currentFiber.set(null);
      }
   }
}
