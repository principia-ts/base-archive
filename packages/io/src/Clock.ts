/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { HasTag } from "@principia/base/data/Has";

import { tag } from "@principia/base/data/Has";

import { asyncInterrupt } from "./IO/combinators/interrupt";
import { asksService, asksServiceM } from "./IO/combinators/service";
import * as I from "./IO/core";

/**
 * Clock Model
 */
export const URI = Symbol();

export abstract class Clock {
  readonly _tag!: typeof URI;

  abstract readonly currentTime: I.UIO<number>;
  abstract readonly sleep: (ms: number) => I.UIO<void>;
}

/**
 * Has Clock
 */
export const HasClock = tag<Clock>();

export type HasClock = HasTag<typeof HasClock>;

/**
 * Live clock implementation
 */
export class LiveClock extends Clock {
  currentTime: I.UIO<number> = I.total(() => new Date().getTime());
  sleep = (ms: number): I.UIO<void> =>
    asyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(I.unit());
      }, ms);

      return I.total(() => {
        clearTimeout(timeout);
      });
    });
}

/**
 * Proxy Clock Implementation
 */
export class ProxyClock extends Clock {
  constructor(readonly currentTime: I.UIO<number>, readonly sleep: (ms: number) => I.UIO<void>) {
    super();
  }
}

/**
 * Get the current time in ms since epoch
 */
export const currentTime = asksServiceM(HasClock)((_) => _.currentTime);

/**
 * Sleeps for the provided amount of ms
 */
export const sleep = (ms: number) => asksServiceM(HasClock)((_) => _.sleep(ms));

/**
 * Access clock from environment
 */
export const withClockM = asksServiceM(HasClock);

/**
 * Access clock from environment
 */
export const withClock = asksService(HasClock);
