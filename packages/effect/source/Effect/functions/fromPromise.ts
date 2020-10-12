import { flow } from "@principia/core/Function";

import type { UIO } from "../core";
import { async, die, fail, pure } from "../core";
import type { IO } from "../Effect";

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export const fromPromiseWith_ = <E, A>(promise: () => Promise<A>, onReject: (reason: unknown) => E): IO<E, A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(onReject, fail, resolve));
   });

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export const fromPromiseWith = <E>(onReject: (reason: unknown) => E) => <A>(promise: () => Promise<A>): IO<E, A> =>
   fromPromiseWith_(promise, onReject);

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export const fromPromise = <A>(promise: () => Promise<A>): IO<unknown, A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(fail, resolve));
   });

/**
 * Like fromPromise but produces a defect in case of errors
 */
export const fromPromiseDie = <A>(promise: () => Promise<A>): UIO<A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(die, resolve));
   });
