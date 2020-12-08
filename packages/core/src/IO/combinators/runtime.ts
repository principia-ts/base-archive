import { constVoid, identity } from "../../Function";
import { none } from "../../Option";
import * as I from "../_core";
import type { Renderer } from "../Cause";
import * as C from "../Cause";
import { pretty } from "../Cause";
import { HasClock, LiveClock } from "../Clock";
import type { Exit } from "../Exit";
import { interruptible } from "../Fiber";
import type { FailureReporter } from "../Fiber/_internal/io";
import { Executor } from "../Fiber/executor";
import { newFiberId } from "../Fiber/FiberId";
import { Platform } from "../Fiber/platform";
import type { Callback } from "../Fiber/state";
import { prettyTrace } from "../Fiber/tracing";
import { _I } from "../model";
import { defaultRandom, HasRandom } from "../Random";
import * as Scope from "../Scope";
import * as Super from "../Supervisor";

export function empty() {
  return;
}

export type DefaultEnv = HasClock & HasRandom;

export function defaultEnv() {
  return {
    [HasClock.key]: new LiveClock(),
    [HasRandom.key]: defaultRandom
  };
}

export const prettyReporter: FailureReporter = (e) => {
  console.error(pretty(e, prettyTrace));
};

const defaultPlatform = new Platform(
  10,
  10,
  true,
  true,
  true,
  true,
  10,
  10,
  10,
  prettyTrace,
  constVoid,
  10_000
);

export class CustomRuntime<R> {
  constructor(readonly env: R, readonly platform: Platform) {
    this.traceExecution = this.traceExecution.bind(this);
    this.traceExecutionLength = this.traceExecutionLength.bind(this);
    this.traceStack = this.traceStack.bind(this);
    this.traceStackLength = this.traceStackLength.bind(this);
    this.traceEffect = this.traceEffect.bind(this);
    this.initialTracingStatus = this.initialTracingStatus.bind(this);
    this.ancestorExecutionTraceLength = this.ancestorExecutionTraceLength.bind(this);
    this.ancestorStackTraceLength = this.ancestorStackTraceLength.bind(this);
    this.ancestryLength = this.ancestryLength.bind(this);
    this.fiberContext = this.fiberContext.bind(this);
    this.run = this.run.bind(this);
    this.runAsap = this.runAsap.bind(this);
    this.runCancel = this.runCancel.bind(this);
    this.runPromise = this.runPromise.bind(this);
    this.runPromiseExit = this.runPromiseExit.bind(this);
    this.traceRenderer = this.traceRenderer.bind(this);
    this.runFiber = this.runFiber.bind(this);
  }

  fiberContext<E, A>() {
    const initialIS = interruptible;
    const fiberId = newFiberId();
    const scope = Scope.unsafeMakeScope<Exit<E, A>>();
    const supervisor = Super.none;

    const context = new Executor<E, A>(
      fiberId,
      this.env,
      initialIS,
      new Map(),
      supervisor,
      scope,
      this.platform.maxOp,
      this.platform.reportFailure,
      this.platform,
      none()
    );

    return context;
  }

  runFiber<E, A>(self: I.IO<R, E, A>): Executor<E, A> {
    const context = this.fiberContext<E, A>();
    context.evaluateLater(self[_I]);
    return context;
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  run<E, A>(_: I.IO<DefaultEnv, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>();

    context.evaluateLater(_[_I]);
    context.runAsync(cb || empty);
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  runAsap<E, A>(_: I.IO<DefaultEnv, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>();

    context.evaluateNow(_[_I]);
    context.runAsync(cb || empty);
  }

  /**
   * Runs effect until completion returing a cancel effecr that when executed
   * triggers cancellation of the process
   */
  runCancel<E, A>(_: I.IO<DefaultEnv, E, A>, cb?: Callback<E, A>): AsyncCancel<E, A> {
    const context = this.fiberContext<E, A>();

    context.evaluateLater(_[_I]);
    context.runAsync(cb || empty);

    return context.interruptAs(context.id);
  }

  /**
   * Run effect as a Promise, throwing a the first error or exception
   */
  runPromise<E, A>(_: I.IO<DefaultEnv, E, A>): Promise<A> {
    const context = this.fiberContext<E, A>();

    context.evaluateLater(_[_I]);

    return new Promise((res, rej) => {
      context.runAsync((exit) => {
        switch (exit._tag) {
          case "Success": {
            res(exit.value);
            break;
          }
          case "Failure": {
            rej(C.squash(identity)(exit.cause));
            break;
          }
        }
      });
    });
  }

  /**
   * Run effect as a Promise of the Exit state
   * in case of error.
   */
  runPromiseExit<E, A>(_: I.IO<DefaultEnv, E, A>): Promise<Exit<E, A>> {
    const context = this.fiberContext<E, A>();

    context.evaluateLater(_[_I]);

    return new Promise((res) => {
      context.runAsync((exit) => {
        res(exit);
      });
    });
  }

  withEnvironment<R2>(f: (_: R) => R2) {
    return new CustomRuntime(f(this.env), this.platform);
  }

  traceRenderer(renderer: Renderer) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  traceExecution(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        b,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  traceExecutionLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        n,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  traceStack(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        b,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  traceStackLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        n,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  traceEffect(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        b,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  initialTracingStatus(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        b,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  ancestorExecutionTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        n,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  ancestorStackTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        n,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  ancestryLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        n,
        this.platform.renderer,
        this.platform.reportFailure,
        this.platform.maxOp
      )
    );
  }

  reportFailure(reportFailure: (_: C.Cause<unknown>) => void) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        reportFailure,
        this.platform.maxOp
      )
    );
  }

  maxOp(maxOp: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength,
        this.platform.renderer,
        this.platform.reportFailure,
        maxOp
      )
    );
  }
}

/**
 * Construct custom runtime
 */
export function makeCustomRuntime() {
  return new CustomRuntime(defaultEnv(), defaultPlatform);
}

/**
 * Default runtime
 */
export const defaultRuntime = makeCustomRuntime();

/**
 * Exports of default runtime
 */
export const {
  fiberContext,
  run,
  runAsap,
  runCancel,
  runFiber,
  runPromise,
  runPromiseExit
} = defaultRuntime;

/**
 * IO Canceler
 */
export type AsyncCancel<E, A> = I.UIO<Exit<E, A>>;

/**
 * Represent an environment providing function
 */
export interface Runtime<R0> {
  in: <R, E, A>(effect: I.IO<R & R0, E, A>) => I.IO<R, E, A>;
  run: <E, A>(_: I.IO<DefaultEnv & R0, E, A>, cb?: Callback<E, A> | undefined) => void;
  runCancel: <E, A>(
    _: I.IO<DefaultEnv & R0, E, A>,
    cb?: Callback<E, A> | undefined
  ) => I.UIO<Exit<E, A>>;
  runPromise: <E, A>(_: I.IO<DefaultEnv & R0, E, A>) => Promise<A>;
  runPromiseExit: <E, A>(_: I.IO<DefaultEnv & R0, E, A>) => Promise<Exit<E, A>>;
}

export function makeRuntime<R0>(r0: R0): Runtime<R0> {
  return {
    in: <R, E, A>(effect: I.IO<R & R0, E, A>) => I.gives_(effect, (r: R) => ({ ...r0, ...r })),
    run: (_, cb) =>
      run(
        I.gives_(_, (r) => ({ ...r0, ...r })),
        cb
      ),
    runCancel: (_, cb) =>
      runCancel(
        I.gives_(_, (r) => ({ ...r0, ...r })),
        cb
      ),
    runPromise: (_) => runPromise(I.gives_(_, (r) => ({ ...r0, ...r }))),
    runPromiseExit: (_) => runPromiseExit(I.gives_(_, (r) => ({ ...r0, ...r })))
  };
}

/**
 * Use current environment to build a runtime that is capable of
 * providing its content to other effects.
 *
 * NOTE: in should be used in a region where current environment
 * is valid (i.e. keep attention to closed resources)
 */
export function runtime<R0>() {
  return I.asksM((r0: R0) =>
    I.total(
      (): Runtime<R0> => {
        return makeRuntime<R0>(r0);
      }
    )
  );
}

export function withRuntimeM<R0, R, E, A>(f: (r: Runtime<R0>) => I.IO<R, E, A>) {
  return I.chain_(runtime<R0>(), f);
}

export function withRuntime<R0, A>(f: (r: Runtime<R0>) => A) {
  return I.chain_(runtime<R0>(), (r) => I.pure(f(r)));
}
