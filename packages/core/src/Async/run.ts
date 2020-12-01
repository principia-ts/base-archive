import * as A from "../Array/_core";
import { pipe } from "../Function";
import * as X from "../SIO";
import type { Stack } from "../Utils/Stack";
import { stack } from "../Utils/Stack";
import * as Ex from "./AsyncExit";
import { CancellablePromise } from "./CancellablePromise";
import { _AI, AsyncInstructionTag } from "./constants";
import { fail, succeed, total } from "./constructors";
import { InterruptionState } from "./InterruptionState";
import type { Async, AsyncInstruction } from "./model";
import { chain, tap } from "./monad";
import { defaultPromiseTracingContext } from "./PromiseTracingContext";

class FoldFrame {
  readonly _tag = "FoldFrame";
  constructor(
    readonly recover: (e: any) => Async<any, any, any>,
    readonly apply: (a: any) => Async<any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _tag = "ApplyFrame";
  constructor(readonly apply: (a: any) => Async<any, any, any>) {}
}

type Frame = FoldFrame | ApplyFrame;

export function runPromiseExitEnv_<R, E, A>(
  async: Async<R, E, A>,
  r: R,
  interruptionState = new InterruptionState()
): Promise<Ex.AsyncExit<E, A>> {
  return defaultPromiseTracingContext.traced(async () => {
    let frames: Stack<Frame> | undefined = undefined;
    let result = null;
    let env: Stack<any> | undefined = stack(r);
    let failed = false;
    let current: Async<any, any, any> | undefined = async;
    let instructionCount = 0;
    let interrupted = false;

    const isInterrupted = () => interrupted || interruptionState.interrupted;

    const popContinuation = (): Frame | undefined => {
      const current = frames?.value;
      frames = frames?.previous;
      return current;
    };

    const pushContinuation = (continuation: Frame): void => {
      frames = stack(continuation, frames);
    };

    const popEnv = () => {
      const current = env?.value;
      env = env?.previous;
      return current;
    };

    const pushEnv = (k: any) => {
      env = stack(k, env);
    };

    const unwindStack = () => {
      let unwinding = true;
      while (unwinding) {
        const next = popContinuation();
        if (next == null) {
          unwinding = false;
        } else if (next._tag === "FoldFrame") {
          unwinding = false;
          pushContinuation(new ApplyFrame(next.recover));
        }
      }
    };

    while (current != null && !isInterrupted()) {
      if (instructionCount > 10000) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined);
          }, 0);
        });
        instructionCount = 0;
      }
      instructionCount += 1;
      const I: AsyncInstruction = current[_AI];
      switch (I._asyncTag) {
        case AsyncInstructionTag.Chain: {
          const nested: AsyncInstruction = I.async[_AI];
          const continuation: (a: any) => Async<any, any, any> = I.f;
          switch (nested._asyncTag) {
            case AsyncInstructionTag.Succeed: {
              current = continuation(nested.value);
              break;
            }
            case AsyncInstructionTag.Total: {
              current = continuation(nested.thunk());
              break;
            }
            case AsyncInstructionTag.Partial: {
              try {
                current = continuation(nested.thunk());
              } catch (e) {
                current = fail(nested.onThrow(e));
              }
              break;
            }
            default: {
              current = nested;
              pushContinuation(new ApplyFrame(continuation));
            }
          }
          break;
        }
        case AsyncInstructionTag.Suspend: {
          current = I.async();
          break;
        }
        case AsyncInstructionTag.Succeed: {
          result = I.value;
          const next = popContinuation();
          if (next) {
            current = next.apply(result);
          } else {
            current = undefined;
          }
          break;
        }
        case AsyncInstructionTag.Total: {
          current = succeed(I.thunk());
          break;
        }
        case AsyncInstructionTag.Partial: {
          try {
            current = succeed(I.thunk());
          } catch (e) {
            current = fail(I.onThrow(e));
          }
          break;
        }
        case AsyncInstructionTag.Fail: {
          unwindStack();
          const next = popContinuation();
          if (next) {
            current = next.apply(I.e);
          } else {
            failed = true;
            result = I.e;
            current = undefined;
          }
          break;
        }
        case AsyncInstructionTag.Done: {
          switch (I.exit._tag) {
            case "Failure": {
              current = fail(I.exit.error);
              break;
            }
            case "Interrupt": {
              interrupted = true;
              current = undefined;
              break;
            }
            case "Success": {
              current = succeed(I.exit.value);
              break;
            }
          }
          break;
        }
        case AsyncInstructionTag.Interrupt: {
          interrupted = true;
          interruptionState.interrupt();
          current = undefined;
          break;
        }
        case AsyncInstructionTag.Asks: {
          current = I.f(env.value || {});
          break;
        }
        case AsyncInstructionTag.Give: {
          current = pipe(
            total(() => {
              pushEnv(I.env);
            }),
            chain(() => I.async),
            tap(() =>
              total(() => {
                popEnv();
              })
            )
          );
          break;
        }
        case AsyncInstructionTag.All: {
          const exits: ReadonlyArray<Ex.AsyncExit<any, any>> = await Promise.all(
            A.map_(I.asyncs, (a) => runPromiseExitEnv_(a, env?.value || {}, interruptionState))
          );
          const results = [];
          let errored = false;
          for (let i = 0; i < exits.length && !errored; i++) {
            const e = exits[i];
            switch (e._tag) {
              case "Success": {
                results.push(e.value);
                break;
              }
              case "Failure": {
                errored = true;
                current = fail(e.error);
                break;
              }
              case "Interrupt": {
                errored = true;
                interrupted = true;
                current = undefined;
                break;
              }
            }
          }
          if (!errored) {
            current = succeed(results);
          }
          break;
        }
        case AsyncInstructionTag.Promise: {
          try {
            current = succeed(
              await new CancellablePromise(
                (s) => I.promise(s).catch((e) => Promise.reject(Ex.failure(e))),
                interruptionState
              ).promise()
            );
          } catch (e) {
            const _e = e as Ex.Rejection<E>;
            switch (_e._tag) {
              case "Failure": {
                current = fail(_e.error);
                break;
              }
              case "Interrupt": {
                interrupted = true;
                current = undefined;
                break;
              }
            }
          }
          break;
        }
        case "SIO": {
          const res = X.runEitherEnv_(I, env?.value || {});
          if (res._tag === "Left") {
            current = fail(res.left);
          } else {
            current = succeed(res.right);
          }
        }
      }
    }
    if (interruptionState.interrupted) {
      return Ex.interrupted();
    }
    if (failed) {
      return Ex.failure(result);
    }
    return Ex.success(result);
  })();
}

export function runPromiseExit<E, A>(
  async: Async<unknown, E, A>,
  interruptionState = new InterruptionState()
): Promise<Ex.AsyncExit<E, A>> {
  return runPromiseExitEnv_(async, {}, interruptionState);
}

export function runPromiseExitInterrupt<E, A>(
  async: Async<unknown, E, A>
): [Promise<Ex.AsyncExit<E, A>>, () => void] {
  const interruptionState = new InterruptionState();
  const p = runPromiseExitEnv_(async, {}, interruptionState);
  const i = () => {
    interruptionState.interrupt();
  };
  return [p, i];
}

export function runAsync<E, A>(
  async: Async<unknown, E, A>,
  onExit?: (exit: Ex.AsyncExit<E, A>) => void
): () => void {
  const interruptionState = new InterruptionState();
  runPromiseExit(async, interruptionState).then(onExit);
  return () => {
    interruptionState.interrupt();
  };
}

export function runAsyncEnv<R, E, A>(
  async: Async<R, E, A>,
  env: R,
  onExit?: (exit: Ex.AsyncExit<E, A>) => void
): () => void {
  const interruptionState = new InterruptionState();
  runPromiseExitEnv_(async, env, interruptionState).then(onExit);
  return () => {
    interruptionState.interrupt();
  };
}
