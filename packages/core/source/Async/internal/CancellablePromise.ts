import * as Ex from "../exit";
import type { InterruptionState } from "./InterruptionState";
import { defaultTracingContext } from "./PromiseTracingContext";

export class CancellablePromise<E, A> {
   readonly _E!: () => E;
   readonly _A!: () => A;

   #initial: () => Promise<A>;

   #reject: ((cause: Ex.Rejection<any>) => void) | undefined = undefined;
   #current: Promise<A> | undefined = undefined;

   constructor(factory: () => Promise<A>, readonly interruptionState: InterruptionState) {
      this.#initial = factory;
   }

   get isRunning(): boolean {
      return !!this.#current;
   }

   readonly promise = (): Promise<A> => {
      if (this.isRunning) {
         throw new Error("Bug: promise() has been called twice");
      }
      if (this.interruptionState.isInterrupted) {
         throw new Error("Bug: promise already interrupted");
      }
      const removeListener = this.interruptionState.listen(() => {
         this.#interrupt();
      });
      const p = new Promise<A>((resolve, reject) => {
         this.#reject = reject;

         this.#initial()
            .then((a) => {
               removeListener();
               if (!this.interruptionState.isInterrupted) {
                  resolve(a);
               }
            })
            .catch((e) => {
               removeListener();
               if (!this.interruptionState.isInterrupted) {
                  reject(e);
               }
            });
      });
      this.#current = p;
      return p;
   };
   #interrupt = () => {
      this.#reject?.(Ex.interrupt());
   };
}

export const runCancellablePromise = async <E, A>(promise: CancellablePromise<E, A>): Promise<Ex.Exit<E, A>> => {
   try {
      const a = await defaultTracingContext.traced(promise.promise)();
      return Ex.done(a);
   } catch (e) {
      return await Promise.resolve(e);
   }
};
