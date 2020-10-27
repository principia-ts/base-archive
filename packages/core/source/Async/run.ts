import type { Either } from "../Either";
import * as E from "../Either";
import { pipe } from "../Function";
import type { Option } from "../Option";
import * as O from "../Option";
import { AtomicReference, Scheduler } from "../support";
import type { Stack } from "../support/Stack";
import { stack } from "../support/Stack";
import * as Ex from "../Task/Exit";
import type { Cause } from "../Task/Exit/Cause";
import * as C from "../Task/Exit/Cause";
import { newFiberId } from "../Task/Fiber/FiberId";
import * as Ac from "./_deps";
import type { Concrete } from "./internal/Concrete";
import { AsyncInstructionTag, concrete } from "./internal/Concrete";
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
                  /* */
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
      readonly recover: (u: unknown) => Async<unknown, unknown, unknown>,
      readonly apply: (u: unknown) => Async<unknown, unknown, unknown>
   ) {}
}

export class ApplyFrame {
   readonly _tag = "ApplyFrame";
   constructor(readonly apply: (u: unknown) => Async<unknown, unknown, unknown>) {}
}

export type Frame = FoldFrame | ApplyFrame;

export class AsyncResult<A> {
   private completed: Option<A> = O.none();
   private listeners: Set<(_: A) => void> = new Set();

   get value(): Option<A> {
      return this.completed;
   }

   get isComplete(): boolean {
      return O.isSome(this.completed);
   }

   set(a: A): void {
      this.completed = O.some(a);
      this.listeners.forEach((f) => f(a));
   }

   complete(a: A) {
      if (O.isSome(this.completed)) {
         throw new Error("Die: Task has already completed");
      }
      this.set(a);
   }

   tryComplete(a: A): boolean {
      if (O.isSome(this.completed)) {
         return false;
      }
      this.set(a);
      return true;
   }

   listen(f: (a: A) => void): () => void {
      if (O.isSome(this.completed)) {
         f(this.completed.value);
      }
      this.listeners.add(f);
      return () => {
         this.listeners.delete(f);
      };
   }
}

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
   constructor(readonly previous: AsyncStatus, readonly epoch: number) {}
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
         return new Suspended(withInterrupting(b)(s.previous), s.epoch);
      }
   }
};

const defaultAsyncScheduler = (() => new Scheduler())();

export class AsyncDriver<E, A> {
   private readonly state = new AtomicReference(initialAsyncState<E, A>());
   private readonly scheduler = defaultAsyncScheduler;
   private frameStack?: Stack<Frame> = undefined;
   private environments?: Stack<any> = undefined;
   private running = false;
   private interruptListeners = new Set<() => Async<unknown, unknown, unknown>>();
   private interrupted = false;

   private fiberId = newFiberId();

   private epoch = 0;

   constructor(initialEnv: any) {
      this.environments = stack(initialEnv);
   }

   private get isInterrupted() {
      return !C.isEmpty(this.state.get.interrupted);
   }

   private get isInterrupting() {
      return isInterrupting(this.state.get);
   }

   private get shouldInterrupt() {
      return this.isInterrupted && !this.isInterrupting;
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

   interrupt(): Async<unknown, never, Ex.Exit<E, A>> {
      const setInterrupt = (): Cause<never> => {
         const s = this.state.get;
         switch (s._tag) {
            case "Executing": {
               if (s.status._tag === "Suspended" && !isInterrupting(s)) {
                  const rejection = C.then(s.interrupted, C.interrupt(this.fiberId));
                  this.state.set(new AsyncStateExecuting(withInterrupting(true)(s.status), s.observers, rejection));
                  this.evaluateLater(Ac.halt(C.interrupt(this.fiberId)));
                  return rejection;
               } else {
                  const rejection = C.then(s.interrupted, C.interrupt(this.fiberId));
                  this.state.set(new AsyncStateExecuting(s.status, s.observers, rejection));
                  return rejection;
               }
            }
            case "Done": {
               return C.interrupt(this.fiberId);
            }
         }
      };
      return Ac.suspend(() => {
         setInterrupt();
         return this.await;
      });
   }

   canRecover(rejection: Cause<unknown>): boolean {
      if (rejection._tag === "Fail" && !this.interrupted) {
         return true;
      }
      return false;
   }

   get isStackEmpty(): boolean {
      return !this.frameStack;
   }

   handleRejection(rejection: Cause<unknown>): Async<unknown, unknown, unknown> | undefined {
      while (!this.isStackEmpty) {
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const frame = this.popFrame()!;
         switch (frame._tag) {
            case "FoldFrame": {
               if (this.canRecover(rejection)) {
                  return frame.recover(rejection);
               }
            }
         }
      }
      this.done(Ex.failure(rejection) as Ex.Exit<E, A>);
      return;
   }

   next(value: unknown): Async<unknown, unknown, unknown> | undefined {
      const frame = this.popFrame();
      if (frame) {
         return frame.apply(value);
      }
      this.done(Ex.succeed(value as A));
      return;
   }

   resume(epoch: number) {
      return (_: Async<unknown, unknown, unknown>) => {
         if (this.exitAsync(epoch)) {
            this.evaluateLater(_);
         }
      };
   }

   enterAsync(epoch: number) {
      const s = this.state.get;
      switch (s._tag) {
         case "Done": {
            throw new Error("Unexpected AsyncDriver completion");
         }
         case "Executing": {
            const newState = new AsyncStateExecuting(new Suspended(s.status, epoch), s.observers, s.interrupted);
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

   start(I: Async<unknown, E, A>): void {
      if (this.running) {
         throw new Error("Bug: Async driver attempted to start more than once");
      }
      this.running = true;
      this.scheduler.dispatch(() => this.evaluateNow(I));
   }

   forkToPromise(start: Async<unknown, unknown, unknown>): Promise<Ex.Exit<unknown, unknown>> {
      return new Promise((resolve) => {
         const d = new AsyncDriver(this.environments?.value);
         d.onExit((exit) => {
            resolve(exit);
         });
         d.evaluateLater(start);
      });
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

   fork(start: Async<unknown, unknown, unknown>) {
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

   exitAsync(epoch: number): boolean {
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

   evaluateNow(start: Async<unknown, unknown, unknown>): void {
      let current: Async<unknown, unknown, unknown> | undefined = start;
      while (current && !this.interrupted) {
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
               current = this.handleRejection(I.e);
               break;
            }
            case AsyncInstructionTag.Fold: {
               current = I.task;
               this.pushFrame(new FoldFrame(I.f, I.g));
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
            case AsyncInstructionTag.All: {
               current = Ac.asyncOption((resolve) => {
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
                  return O.none();
               });

               break;
            }
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
