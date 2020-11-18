/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { HasTag } from "../../Has";
import { tag } from "../../Has";
import * as T from "../Task/_core";
import { asyncInterrupt } from "../Task/combinators/interrupt";
import { asksService, asksServiceM } from "../Task/combinators/service";

/**
 * Clock Model
 */
export const URI = Symbol();

export abstract class Clock {
  readonly _tag!: typeof URI;

  abstract readonly currentTime: T.IO<number>;
  abstract readonly sleep: (ms: number) => T.IO<void>;
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
  currentTime: T.IO<number> = T.total(() => new Date().getTime());
  sleep = (ms: number): T.IO<void> =>
    asyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(T.unit());
      }, ms);

      return T.total(() => {
        clearTimeout(timeout);
      });
    });
}

/**
 * Proxy Clock Implementation
 */
export class ProxyClock extends Clock {
  constructor(readonly currentTime: T.IO<number>, readonly sleep: (ms: number) => T.IO<void>) {
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
