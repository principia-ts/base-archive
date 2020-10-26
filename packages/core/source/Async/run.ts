import { pipe } from "../Function";
import type { Option } from "../Option";
import * as O from "../Option";
import { Scheduler } from "../support";
import type { Stack } from "../support/Stack";
import { stack } from "../support/Stack";
import { fail, succeed, total } from "./constructors";
import * as Ex from "./exit";
import type { Concrete } from "./internal/Concrete";
import { AsyncInstructionTag, concrete } from "./internal/Concrete";
import { chain, giveAll, tap } from "./methods";
import type { Async } from "./model";

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

const defaultAsyncScheduler = (() => new Scheduler())();

export class AsyncDriver<E, A> {
   private frameStack?: Stack<Frame> = undefined;
   private environments?: Stack<any> = undefined;
   private result: AsyncResult<Ex.Exit<E, A>> = new AsyncResult();
   private running = false;
   private scheduler = defaultAsyncScheduler;
   private interruptListeners = new Set<() => Async<unknown, unknown, unknown>>();
   private interrupted = false;

   constructor(initialEnv: any) {
      this.environments = stack(initialEnv);
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

   onExit(f: (exit: Ex.Exit<E, A>) => void): () => void {
      return this.result.listen(f);
   }

   interrupt(): void {
      this.interrupted = true;
      this.result.complete(Ex.interrupt());
   }

   canRecover(rejection: Ex.Rejection<unknown>): boolean {
      if (rejection._tag === "Fail" && !this.interrupted) {
         return true;
      }
      return false;
   }

   get isStackEmpty(): boolean {
      return !this.frameStack;
   }

   handleRejection(rejection: Ex.Rejection<unknown>): Async<unknown, unknown, unknown> | undefined {
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
      this.result.complete(rejection as Ex.Rejection<E>);
      return;
   }

   next(value: unknown): Async<unknown, unknown, unknown> | undefined {
      const frame = this.popFrame();
      if (frame) {
         return frame.apply(value);
      }
      this.result.complete(Ex.done(value as A));
      return;
   }

   resume(status: Async<unknown, unknown, unknown>): void {
      this.scheduler.dispatchLater(() => {
         this.evaluateNow(status);
      });
   }

   promise(register: (resolve: (_: Async<unknown, unknown, unknown>) => void) => void) {
      let complete = false;
      register((status) => {
         if (complete) {
            return;
         }
         complete = true;
         this.resume(status);
      });
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
         d.start(start);
      });
   }

   all(Is: ReadonlyArray<Async<unknown, unknown, unknown>>): void {
      this.promise(async (resolve) => {
         const results: Array<Ex.Exit<unknown, unknown>> = [];
         const running = new Set<Promise<Ex.Exit<unknown, unknown>>>();
         for (let i = 0; i < Is.length; i++) {
            const p = this.forkToPromise(Is[i]);
            running.add(p);
            p.then((exit) => {
               running.delete(p);
               results.push(exit);
            });
         }
         await Promise.all(running);
         resolve(succeed(results));
      });
   }

   evaluateLater(start: Async<unknown, unknown, unknown>): void {
      this.scheduler.dispatchLater(() => {
         this.evaluateNow(start);
      });
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
                        current = succeed(nested.thunk());
                     } catch (e) {
                        current = fail(nested.onThrow(e));
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
               this.promise(I.register);
               current = undefined;
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
               current = this.handleRejection(Ex.fail(I.e));
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
                  total(() => {
                     this.pushEnv(I.r);
                  }),
                  chain(() => I.task),
                  tap(() =>
                     total(() => {
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
               this.all(I.tasks);
               current = undefined;
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
      driver.onExit(callback);
   }
   return () => {
      run(total(() => driver.interrupt()));
   };
};

export const runPromiseExit = <E, A>(task: Async<unknown, E, A>): Promise<Ex.Exit<E, A>> => {
   const driver = new AsyncDriver<E, A>({});
   driver.evaluateLater(task);
   return new Promise<Ex.Exit<E, A>>((resolve) => {
      driver.onExit(resolve);
   });
};
