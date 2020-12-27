import type { Exit } from "../../Exit";
import type { FailureReporter } from "../../Fiber/_internal/io";
import type { Callback } from "../../Fiber/core";

import { constVoid, identity } from "@principia/base/data/Function";

import * as C from "../../Cause/core";
import { pretty } from "../../Cause/core";
import { HasClock, LiveClock } from "../../Clock";
import { interruptible, newFiberId } from "../../Fiber";
import { FiberContext } from "../../FiberContext";
import { Platform } from "../../Platform";
import { defaultRandom, HasRandom } from "../../Random";
import * as Scope from "../../Scope";
import * as Super from "../../Supervisor";
import * as I from "../core";
import { _I } from "../core";

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
  console.error(pretty(e));
};

const defaultPlatform = new Platform(constVoid, 10_000);

export class CustomRuntime<R> {
  constructor(readonly env: R, readonly platform: Platform) {
    this.fiberContext = this.fiberContext.bind(this);
    this.run = this.run.bind(this);
    this.runAsap = this.runAsap.bind(this);
    this.runCancel = this.runCancel.bind(this);
    this.runPromise = this.runPromise.bind(this);
    this.runPromiseExit = this.runPromiseExit.bind(this);
    this.runFiber = this.runFiber.bind(this);
  }

  fiberContext<E, A>() {
    const initialIS = interruptible;
    const fiberId = newFiberId();
    const scope = Scope.unsafeMakeScope<Exit<E, A>>();
    const supervisor = Super.none;

    const context = new FiberContext<E, A>(
      fiberId,
      this.env,
      initialIS,
      new Map(),
      supervisor,
      scope,
      this.platform.maxOp,
      this.platform.reportFailure,
      this.platform
    );

    return context;
  }

  runFiber<E, A>(self: I.IO<R, E, A>): FiberContext<E, A> {
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
  return I.flatMap_(runtime<R0>(), f);
}

export function withRuntime<R0, A>(f: (r: Runtime<R0>) => A) {
  return I.flatMap_(runtime<R0>(), (r) => I.pure(f(r)));
}
