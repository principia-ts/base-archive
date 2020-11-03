/* eslint-disable no-fallthrough */
import * as A from "../Array";
import * as Ex from "./AsyncExit";
import { CancellablePromise } from "./CancellablePromise";
import { InterruptionState } from "./InterruptionState";
import type { Async } from "./model";
import { _AI, AsyncInstructionTag } from "./model";
import { defaultPromiseTracingContext } from "./PromiseTracingContext";

const _run = async <R, E, A>(async: Async<R, E, A>, r: R, interruptionState = new InterruptionState()): Promise<A> => {
   const I = async[_AI];

   if (interruptionState.interrupted) {
      throw Ex.interrupted();
   }

   switch (I._asyncTag) {
      case AsyncInstructionTag.Pure: {
         return I.value;
      }
      case AsyncInstructionTag.Suspend: {
         return await _run(I.async(), r, interruptionState);
      }
      case AsyncInstructionTag.Asks: {
         return await _run(I.f(r), r, interruptionState);
      }
      case AsyncInstructionTag.Done: {
         switch (I.exit._tag) {
            case "Failure": {
               throw I.exit.error;
            }
            case "Interrupt": {
               throw Ex.interrupted();
            }
            case "Success": {
               return I.exit.value;
            }
         }
      }
      case AsyncInstructionTag.Chain: {
         const a = await _run(I.async, r, interruptionState);
         return await _run(I.f(a), r, interruptionState);
      }
      case AsyncInstructionTag.Give: {
         return await _run(I.async, I.env, interruptionState);
      }
      case AsyncInstructionTag.Fold: {
         const a = await runPromiseExitEnv(I.async, r, interruptionState);

         switch (a._tag) {
            case "Failure": {
               return await _run(I.f(a.error), r, interruptionState);
            }
            case "Interrupt": {
               throw Ex.interrupted();
            }
            case "Success": {
               return await _run(I.g(a.value), r, interruptionState);
            }
         }
      }
      case AsyncInstructionTag.Finalize: {
         const a = await runPromiseExitEnv(I.async, r, interruptionState);

         switch (a._tag) {
            case "Failure": {
               throw Ex.failure(a.error);
            }
            case "Interrupt": {
               await _run(I.f(), r, new InterruptionState());
               throw Ex.interrupted();
            }
            case "Success": {
               return a.value;
            }
         }
         break;
      }
      case AsyncInstructionTag.Promise: {
         return await new CancellablePromise(
            (s) => I.promise(s).catch((e) => Promise.reject(Ex.failure(I.onError(e)))),
            interruptionState
         ).promise();
      }
      case AsyncInstructionTag.All: {
         return (await Promise.all(A.map_(I.asyncs, (a) => _run(a, r, interruptionState)))) as any;
      }
   }
};

export const runPromiseExitEnv = async <R, E, A>(
   async: Async<R, E, A>,
   env: R,
   interruptionState = new InterruptionState()
): Promise<Ex.AsyncExit<E, A>> => {
   try {
      const a = await defaultPromiseTracingContext.traced(() => _run(async, env, interruptionState))();
      return Ex.success(a);
   } catch (e) {
      return e;
   }
};

export const runPromiseExit = async <E, A>(
   async: Async<unknown, E, A>,
   interruptionState = new InterruptionState()
): Promise<Ex.AsyncExit<E, A>> => {
   try {
      const a = await defaultPromiseTracingContext.traced(() => _run(async, {}, interruptionState))();
      return Ex.success(a);
   } catch (e) {
      return e;
   }
};

export const runAsync = <E, A>(async: Async<unknown, E, A>, onExit?: (exit: Ex.AsyncExit<E, A>) => void) => {
   const interruptionState = new InterruptionState();
   runPromiseExit(async, interruptionState).then(onExit);
   return () => {
      interruptionState.interrupt();
   };
};

export const runAsyncEnv = <R, E, A>(async: Async<R, E, A>, env: R, onExit?: (exit: Ex.AsyncExit<E, A>) => void) => {
   const interruptionState = new InterruptionState();
   runPromiseExitEnv(async, env, interruptionState).then(onExit);
   return () => {
      interruptionState.interrupt();
   };
};
