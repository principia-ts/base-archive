import type { IO } from "../_core";
import { async, die, fail, pure } from "../_core";
import { flow } from "../../../Function";
import type { EIO } from "../model";

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export const fromPromiseWith_ = <E, A>(promise: () => Promise<A>, onReject: (reason: unknown) => E): EIO<E, A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(onReject, fail, resolve));
   });

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export const fromPromiseWith = <E>(onReject: (reason: unknown) => E) => <A>(promise: () => Promise<A>): EIO<E, A> =>
   fromPromiseWith_(promise, onReject);

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export const fromPromise = <A>(promise: () => Promise<A>): EIO<unknown, A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(fail, resolve));
   });

/**
 * Like fromPromise but produces a defect in case of errors
 */
export const fromPromiseDie = <A>(promise: () => Promise<A>): IO<A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(die, resolve));
   });
