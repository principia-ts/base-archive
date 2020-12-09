import { flow } from "../../Function";
import type { UIO } from "../_core";
import { async, die, fail, pure } from "../_core";
import type { FIO } from "../model";

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith_<E, A>(
  promise: () => Promise<A>,
  onReject: (reason: unknown) => E
): FIO<E, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(onReject, fail, resolve));
  });
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith<E>(
  onReject: (reason: unknown) => E
): <A>(promise: () => Promise<A>) => FIO<E, A> {
  return (promise) => fromPromiseWith_(promise, onReject);
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export function fromPromise<A>(promise: () => Promise<A>): FIO<unknown, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(fail, resolve));
  });
}

/**
 * Like fromPromise but produces a defect in case of errors
 */
export function fromPromiseDie<A>(promise: () => Promise<A>): UIO<A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(die, resolve));
  });
}
