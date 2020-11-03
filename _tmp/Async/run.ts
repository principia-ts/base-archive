import type { Either } from "../Either";
import * as E from "../Either";
import { pipe } from "../Function";
import * as O from "../Option";
import { AtomicReference, Scheduler } from "../support";
import type { Stack } from "../support/Stack";
import { stack } from "../support/Stack";
import * as Ex from "../Task/Exit";
import type { Cause } from "../Task/Exit/Cause";
import * as C from "../Task/Exit/Cause";
import { newFiberId } from "../Task/Fiber/FiberId";
import * as Ac from "./_deps";
import { die } from "./constructors";
import type { Concrete, RaceInstruction } from "./internal/Concrete";
import { AsyncInstructionTag, concrete } from "./internal/Concrete";
import { InterruptStatus } from "./internal/InterruptStatus";
import { chain, giveAll, tap } from "./methods";
import type { Async } from "./model";

export class AsyncTracingContext {
   readonly running = new Set<AsyncDriver<any, any>>();
   readonly listeners = new Set<() => void>();
   readonly interval = new AtomicReference<NodeJS.Timeout | undefined>(undefined);
   private done = false;

   private finish() {
      if (!this.done) {
         this.done = true;
         this.listeners.forEach((f) => {
            f();
         });
      }
   }

   listen(f: () => void) {
      this.listeners.add(f);
   }

   trace(driver: AsyncDriver<any, any>) {
      if (!this.running.has(driver)) {
         if (typeof this.interval.get === "undefined") {
            this.interval.set(
               setInterval(() => {
                  //
               }, 60000)
            );
         }

         this.running.add(driver);

         driver.runAsync(() => {
            this.running.delete(driver);
            if (this.running.size === 0) {
               const ci = this.interval.get;
               if (ci) {
                  clearInterval(ci);
               }
               this.finish();
            }
         });
      }
   }
}

export class FoldFrame {
   readonly _tag = "FoldFrame";
   constructor(
      readonly recover: (u: Cause<unknown>) => Async<unknown, unknown, unknown>,
      readonly apply: (u: unknown) => Async<unknown, unknown, unknown>
   ) {}
}

export class ApplyFrame {
   readonly _tag = "ApplyFrame";
   constructor(readonly apply: (u: unknown) => Async<unknown, unknown, unknown>) {}
}

export class InterruptExitFrame {
   readonly _tag = "InterruptExitFrame";
   constructor(readonly apply: (a: any) => Async<unknown, unknown, unknown>) {}
}

export class HandlerFrame {
   readonly _tag = "HandlerFrame";
   constructor(readonly apply: (a: any) => Async<unknown, unknown, unknown>) {}
}

export type Frame = FoldFrame | ApplyFrame | InterruptExitFrame | HandlerFrame;

export class Done {
   readonly _tag = "Done";
}

export class Finishing {
   readonly _tag = "Finishing";
   constructor(readonly interrupting: boolean) {}
}

export class Running {
   readonly _tag = "Running";
   constructor(readonly interrupting: boolean) {}
}

export class Suspended {
   readonly _tag = "Suspended";
   constructor(readonly previous: AsyncStatus, readonly interruptible: boolean, readonly epoch: number) {}
}

export type AsyncStatus = Done | Finishing | Running | Suspended;

export class AsyncStateExecuting<E, A> {
   readonly _tag = "Executing";
   constructor(
      readonly status: AsyncStatus,
      readonly observers: Array<(_: Ex.Exit<never, Ex.Exit<E, A>>) => void>,
      readonly interrupted: C.Cause<never>
   ) {}
}

export type AsyncState<E, A> = AsyncStateExecuting<E, A> | AsyncStateDone<E, A>;

export const initialAsyncState = <E, A>(): AsyncState<E, A> => new AsyncStateExecuting(new Running(false), [], C.empty);

export class AsyncStateDone<E, A> {
   readonly _tag = "Done";
   readonly interrupted = C.empty;
   readonly status: AsyncStatus = new Done();
   constructor(readonly value: Ex.Exit<E, A>) {}
}

const isInterrupting = <E, A>(state: AsyncState<E, A>) => {
   const loop = (status: AsyncStatus): boolean => {
      switch (status._tag) {
         case "Running": {
            return status.interrupting;
         }
         case "Finishing": {
            return status.interrupting;
         }
         case "Suspended": {
            return loop(status.previous);
         }
         case "Done": {
            return false;
         }
      }
   };
   return loop(state.status);
};

const withInterrupting = (b: boolean) => (s: AsyncStatus): AsyncStatus => {
   switch (s._tag) {
      case "Done": {
         return s;
      }
      case "Finishing": {
         return new Finishing(b);
      }
      case "Running": {
         return new Running(b);
      }
      case "Suspended": {
         return new Suspended(withInterrupting(b)(s.previous), s.interruptible, s.epoch);
      }
   }
};

const defaultAsyncScheduler = (() => new Scheduler())();

export class AsyncDriver<E, A> {
   private readonly state = new AtomicReference(initialAsyncState<E, A>());
   private readonly scheduler = defaultAsyncScheduler;
   private frameStack?: Stack<Frame> = undefined;
   private environments?: Stack<any> = undefined;
   private interruptListeners = new Set<() => Async<unknown, unknown, unknown>>();
   private interrupted = false;
   private interruptStatus?: Stack<boolean> = stack(true);

   private fiberId = newFiberId();

   private epoch = 0;

   constructor(initialEnv: any) {
      this.environments = stack(initialEnv);
   }

   private get isInterruptible() {
      return this.interruptStatus ? this.interruptStatus.value : true;
   }

   private get isInterrupted() {
      return !C.isEmpty(this.state.get.interrupted);
   }

   private get isInterrupting() {
      return isInterrupting(this.state.get);
   }

   private get shouldInterrupt() {
      return this.isInterrupted && this.isInterruptible && !this.isInterrupting;
   }

   private popFrame(): Frame | undefined {
      const frame = this.frameStack?.value;
      this.frameStack = this.frameStack?.previous;
      return frame;
   }

   private pushFrame(frame: Frame): void {
      this.frameStack = stack(frame, this.frameStack);
   }

   private popEnv(): any | undefined {
      const env = this.environments?.value;
      this.environments = this.environments?.previous;
      return env;
   }

   private pushEnv(env: any): void {
      this.environments = stack(env, this.environments);
   }

   private pushInterruptStatus(flag: boolean) {
      this.interruptStatus = stack(flag, this.interruptStatus);
   }

   private popInterruptStatus() {
      const current = this.interruptStatus?.value;
      this.interruptStatus = this.interruptStatus?.previous;
      return current;
   }

   private setInterrupting(b: boolean): void {
      const s = this.state.get;

      switch (s._tag) {
         case "Executing": {
            this.state.set(new AsyncStateExecuting(withInterrupting(b)(s.status), s.observers, s.interrupted));
            return;
         }
         case "Done": {
            return;
         }
      }
   }

   private interruptExit = new InterruptExitFrame((v: any) => {
      if (this.isInterruptible) {
         this.popInterruptStatus();
         return Ac.succeed(v);
      } else {
         return Ac.total(() => {
            this.popInterruptStatus();
            return v;
         });
      }
   });

   private done(exit: Ex.Exit<E, A>): Async<unknown, unknown, unknown> | undefined {
      const s = this.state.get;
      switch (s._tag) {
         case "Done": {
            return undefined;
         }
         case "Executing": {
            this.state.set(new AsyncStateDone(exit));
            s.observers.forEach((f) => f(Ex.succeed(exit)));
            return undefined;
         }
      }
   }

   onExit(f: (exit: Ex.Exit<never, Ex.Exit<E, A>>) => void): void {
      const s = this.state.get;
      switch (s._tag) {
         case "Done": {
            f(Ex.succeed(s.value));
            return;
         }
         case "Executing": {
            this.state.set(new AsyncStateExecuting(s.status, [f, ...s.observers], s.interrupted));
         }
      }
   }

   private registerObserver(cb: (exit: Ex.Exit<never, Ex.Exit<E, A>>) => void): Ex.Exit<E, A> | null {
      const s = this.state.get;

      switch (s._tag) {
         case "Done": {
            return s.value;
         }
         case "Executing": {
            const observers = [cb, ...s.observers];

            this.state.set(new AsyncStateExecuting(s.status, observers, s.interrupted));

            return null;
         }
      }
   }

   private kill(): Async<unknown, never, Ex.Exit<E, A>> {
      const interruptedCause = C.interrupt(this.fiberId);

      const setInterruptedLoop = (): C.Cause<never> => {
         const s = this.state.get;

         switch (s._tag) {
            case "Executing": {
               if (s.status._tag === "Suspended" && s.status.interruptible && !isInterrupting(s)) {
                  const newCause = C.then(s.interrupted, interruptedCause);

                  this.state.set(new AsyncStateExecuting(withInterrupting(true)(s.status), s.observers, newCause));

                  this.evaluateLater(Ac.halt(C.interrupt(this.fiberId)));

                  return newCause;
               } else {
                  const newCause = C.then(s.interrupted, interruptedCause);
                  this.state.set(new AsyncStateExecuting(s.status, s.observers, newCause));
                  return newCause;
               }
            }
            case "Done": {
               return interruptedCause;
            }
         }
      };

      return Ac.suspend(() => {
         setInterruptedLoop();
         return this.await;
      });
   }

   interrupt(): Async<unknown, never, Ex.Exit<E, A>> {
      return this.kill();
   }

   get isStackEmpty(): boolean {
      return !this.frameStack;
   }

   private unwindStack(): boolean {
      let unwinding = true;
      let discardedFolds = false;
      while (unwinding && !this.isStackEmpty) {
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const frame = this.popFrame()!;
         switch (frame._tag) {
            case "InterruptExitFrame": {
               this.popInterruptStatus();
               break;
            }
            case "FoldFrame": {
               if (!this.shouldInterrupt) {
                  this.pushFrame(new HandlerFrame(frame.recover));
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

   private next(value: unknown): Async<unknown, unknown, unknown> | undefined {
      const frame = this.popFrame();
      if (frame) {
         return frame.apply(value);
      }
      this.done(Ex.succeed(value as A));
      return;
   }

   private resume(epoch: number) {
      return (_: Async<unknown, unknown, unknown>) => {
         if (this.exitAsync(epoch)) {
            this.evaluateLater(_);
         }
      };
   }

   private enterAsync(epoch: number) {
      const s = this.state.get;
      switch (s._tag) {
         case "Done": {
            throw new Error("Unexpected AsyncDriver completion");
         }
         case "Executing": {
            const newState = new AsyncStateExecuting(
               new Suspended(s.status, this.isInterruptible, epoch),
               s.observers,
               s.interrupted
            );
            this.state.set(newState);

            if (this.shouldInterrupt) {
               this.exitAsync(epoch);
               return Ac.halt(this.state.get.interrupted);
            } else {
               return undefined;
            }
         }
      }
   }

   private observe(cb: (exit: Ex.Exit<never, Ex.Exit<E, A>>) => void) {
      const x = this.registerObserver(cb);
      if (x != null) {
         return O.some(Ac.succeed(x));
      }
      return O.none();
   }

   get await(): Async<unknown, never, Ex.Exit<E, A>> {
      return Ac.maybeAsyncInterrupt(
         (r): Either<Async<unknown, never, void>, Async<unknown, never, Ex.Exit<E, A>>> => {
            const cb = (exit: Ex.Exit<never, Ex.Exit<E, A>>): void => r(Ac.done(exit));
            return O.fold_(this.observe(cb), () => E.left(Ac.total(() => this.interruptObserver(cb))), E.right);
         }
      );
   }

   private interruptObserver(cb: (exit: Ex.Exit<never, Ex.Exit<E, A>>) => void): void {
      const s = this.state.get;
      if (s._tag === "Executing") {
         const observers = s.observers.filter((o) => o !== cb);
         this.state.set(new AsyncStateExecuting(s.status, observers, s.interrupted));
      }
   }

   fork(start: Async<any, any, any>) {
      const d = new AsyncDriver(this.environments?.value || {});
      this.scheduler.dispatchLater(() => {
         d.evaluateNow(start);
      });
      return d;
   }

   runAsync(cb: (exit: Ex.Exit<E, A>) => void) {
      const v = this.registerObserver((xx) => cb(Ex.flatten(xx)));

      if (v) {
         cb(v);
      }
   }

   evaluateLater(start: Async<unknown, unknown, unknown>): void {
      this.scheduler.dispatchLater(() => {
         this.evaluateNow(start);
      });
   }

   private exitAsync(epoch: number): boolean {
      const s = this.state.get;
      switch (s._tag) {
         case "Done": {
            return false;
         }
         case "Executing": {
            if (s.status._tag === "Suspended" && epoch === s.status.epoch) {
               this.state.set(new AsyncStateExecuting(s.status, s.observers, s.interrupted));
               return true;
            } else {
               return false;
            }
         }
      }
   }

   private completeRace<R, R1, R2, E2, A2, R3, E3, A3>(
      winner: AsyncDriver<any, any>,
      loser: AsyncDriver<any, any>,
      cont: (exit: Ex.Exit<any, any>, fiber: AsyncDriver<any, any>) => Async<any, any, any>,
      winnerExit: Ex.Exit<any, any>,
      ab: AtomicReference<boolean>,
      cb: (_: Async<R & R1 & R2 & R3, E2 | E3, A2 | A3>) => void
   ): void {
      if (ab.compareAndSet(true, false)) {
         cb(cont(winnerExit, loser));
      }
   }

   private raceWithImpl<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
      race: RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>
   ): Async<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
      const raceIndicator = new AtomicReference(true);
      const left = this.fork(race.left);
      const right = this.fork(race.right);

      return Ac.async((resolve) => {
         const leftRegister = left.registerObserver((exit) => {
            switch (exit._tag) {
               case "Failure": {
                  this.completeRace(left, right, race.leftWins, exit, raceIndicator, resolve);
                  break;
               }
               case "Success": {
                  this.completeRace(left, right, race.leftWins, exit.value, raceIndicator, resolve);
                  break;
               }
            }
         });

         if (leftRegister != null) {
            this.completeRace(left, right, race.leftWins, leftRegister, raceIndicator, resolve);
         } else {
            const rightRegister = right.registerObserver((exit) => {
               switch (exit._tag) {
                  case "Failure": {
                     this.completeRace(right, left, race.rightWins, exit, raceIndicator, resolve);
                     break;
                  }
                  case "Success": {
                     this.completeRace(right, left, race.rightWins, exit.value, raceIndicator, resolve);
                     break;
                  }
               }
            });

            if (rightRegister != null) {
               this.completeRace(right, left, race.rightWins, rightRegister, raceIndicator, resolve);
            }
         }
      });
   }

   evaluateNow(start: Async<unknown, unknown, unknown>): void {
      let current: Async<unknown, unknown, unknown> | undefined = start;
      while (current != null) {
         if (!this.shouldInterrupt) {
            try {
               const I: Concrete = concrete(current);
               switch (I._asyncTag) {
                  case AsyncInstructionTag.Chain: {
                     const nested: Concrete = concrete(I.task);
                     const continuation: (a: unknown) => Async<unknown, unknown, unknown> = I.f;

                     switch (nested._asyncTag) {
                        case AsyncInstructionTag.Pure: {
                           current = continuation(nested.a);
                           break;
                        }
                        case AsyncInstructionTag.Total: {
                           current = continuation(nested.thunk());
                           break;
                        }
                        case AsyncInstructionTag.PartialSync: {
                           try {
                              current = Ac.succeed(nested.thunk());
                           } catch (e) {
                              current = Ac.fail(nested.onThrow(e));
                           }
                           break;
                        }
                        default: {
                           current = nested;
                           this.pushFrame(new ApplyFrame(continuation));
                        }
                     }
                     break;
                  }
                  case AsyncInstructionTag.Total: {
                     current = this.next(I.thunk());
                     break;
                  }
                  case AsyncInstructionTag.PartialSync: {
                     try {
                        current = this.next(I.thunk());
                     } catch (e) {
                        current = fail(I.onThrow(e));
                     }
                     break;
                  }
                  case AsyncInstructionTag.Async: {
                     const c = I;
                     const epoch = this.epoch;
                     this.epoch = this.epoch + 1;
                     current = this.enterAsync(epoch);
                     if (!current) {
                        const onResolve = c.register;
                        const h = onResolve(this.resume(epoch));

                        switch (h._tag) {
                           case "None": {
                              current = undefined;
                              break;
                           }
                           case "Some": {
                              if (this.exitAsync(epoch)) {
                                 current = h.value;
                              } else {
                                 current = undefined;
                              }
                              break;
                           }
                        }
                     }
                     break;
                  }
                  case AsyncInstructionTag.Suspend: {
                     current = I.factory();
                     break;
                  }
                  case AsyncInstructionTag.Pure: {
                     current = this.next(I.a);
                     break;
                  }
                  case AsyncInstructionTag.Fail: {
                     const discardedFolds = this.unwindStack();
                     const fullCause = I.e;
                     const maybeRedactedCause = discardedFolds ? C.stripFailures(fullCause) : fullCause;

                     if (this.isStackEmpty) {
                        const cause = () => {
                           const interrupted = this.state.get.interrupted;
                           const causeAndInterrupt = C.contains(interrupted)(maybeRedactedCause)
                              ? maybeRedactedCause
                              : C.then(maybeRedactedCause, interrupted);
                           return causeAndInterrupt;
                        };
                        this.setInterrupting(true);

                        current = this.done(Ex.failure(cause()) as any);
                     } else {
                        this.setInterrupting(false);
                        current = this.next(maybeRedactedCause);
                     }
                     break;
                  }
                  case AsyncInstructionTag.Fold: {
                     current = I.task;
                     this.pushFrame(new FoldFrame(I.f, I.g));
                     break;
                  }
                  case AsyncInstructionTag.Fork: {
                     current = this.next(this.fork(I.task));
                     break;
                  }
                  case AsyncInstructionTag.Read: {
                     current = I.f(this.environments?.value || {});
                     break;
                  }
                  case AsyncInstructionTag.Give: {
                     current = pipe(
                        Ac.total(() => {
                           this.pushEnv(I.r);
                        }),
                        chain(() => I.task),
                        tap(() =>
                           Ac.total(() => {
                              this.popEnv();
                           })
                        )
                     );
                     break;
                  }
                  case AsyncInstructionTag.OnInterrupt: {
                     const env = this.environments?.value;
                     this.interruptListeners.add(() => pipe(I.f(), giveAll(env)));
                     current = I.task;
                     break;
                  }
                  case AsyncInstructionTag.InterruptStatus: {
                     this.pushInterruptStatus(I.flag.toBoolean);
                     this.pushFrame(this.interruptExit);
                     current = I.task;
                     break;
                  }
                  case AsyncInstructionTag.CheckInterruptible: {
                     current = I.f(new InterruptStatus(this.isInterruptible));
                     break;
                  }
                  case AsyncInstructionTag.All: {
                     current = Ac.async((resolve) => {
                        const results: Array<Ex.Exit<unknown, unknown>> = Array(I.tasks.length);
                        const tracer = new AsyncTracingContext();
                        tracer.listen(() => {
                           resolve(Ac.done(O.getOrElse_(Ex.collectAllPar(...results), () => Ex.succeed([]))));
                        });
                        for (let i = 0; i < I.tasks.length; i++) {
                           const d = this.fork(I.tasks[i]);
                           tracer.trace(d);
                           d.runAsync((ex) => {
                              results[i] = ex;
                           });
                        }
                     });
                     break;
                  }
                  case AsyncInstructionTag.Race: {
                     current = this.raceWithImpl(I);
                     break;
                  }
               }
            } catch (e) {
               this.setInterrupting(true);
               current = die(e);
            }
         } else {
            current = Ac.halt(this.state.get.interrupted);
            this.setInterrupting(true);
         }
      }
   }
}

export const run = <E, A>(task: Async<unknown, E, A>, callback?: (exit: Ex.Exit<E, A>) => void) => {
   const driver = new AsyncDriver<E, A>({});
   driver.evaluateLater(task);
   if (callback) {
      driver.runAsync(callback);
   }
   return () => {
      run(driver.interrupt());
   };
};

export const runPromiseExit = <E, A>(task: Async<unknown, E, A>): Promise<Ex.Exit<E, A>> => {
   const driver = new AsyncDriver<E, A>({});
   driver.evaluateLater(task);
   return new Promise<Ex.Exit<E, A>>((resolve) => {
      driver.runAsync(resolve);
   });
};

export const runPromiseExitInterrupt = <E, A>(task: Async<unknown, E, A>): [Promise<Ex.Exit<E, A>>, () => void] => {
   const driver = new AsyncDriver<E, A>({});
   driver.evaluateLater(task);
   const promise = new Promise<Ex.Exit<E, A>>((resolve) => {
      driver.runAsync(resolve);
   });
   return [
      promise,
      () => {
         run(driver.interrupt());
      }
   ];
};
