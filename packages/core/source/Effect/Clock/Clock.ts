/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import * as T from "../Effect/core";
import { asyncInterrupt } from "../Effect/functions/interrupt";
import { asksService, asksServiceM } from "../Effect/functions/service";
import type { HasTag } from "../Has";
import { has } from "../Has";

//
// Clock Definition
//
export const URI = Symbol();

export interface Clock {
   readonly _tag: typeof URI;

   readonly currentTime: T.UIO<number>;
   readonly sleep: (ms: number) => T.UIO<void>;
}

//
// Has Clock
//
export const HasClock = has<Clock>();

export type HasClock = HasTag<typeof HasClock>;

//
// Live Clock Implementation
//
export const LiveClock = (): Clock => ({
   _tag: URI,
   currentTime: T.total(() => new Date().getTime()),
   sleep: (ms) =>
      asyncInterrupt((cb) => {
         const timeout = setTimeout(() => {
            cb(T.unit);
         }, ms);

         return T.total(() => {
            clearTimeout(timeout);
         });
      })
});

//
// Proxy Clock Implementation
//
export const ProxyClock = (currentTime: T.UIO<number>, sleep: (ms: number) => T.UIO<void>): Clock => ({
   _tag: URI,
   currentTime,
   sleep
});

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
