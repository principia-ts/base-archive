/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { HasTag } from "../Has";
import { has } from "../Has";
import * as T from "../Task/core";
import { asksServiceM, replaceService } from "../Task/functions/service";
import { PRNG } from "./Alea";

export const URI = Symbol();

export abstract class Random {
   readonly _URI!: typeof URI;

   abstract readonly next: T.UIO<number>;
   abstract readonly nextBoolean: T.UIO<boolean>;
   abstract readonly nextInt: T.UIO<number>;
   abstract readonly nextDouble: T.UIO<number>;
   abstract readonly nextRange: (low: number, high: number) => T.UIO<number>;
   abstract readonly nextIntBetween: (low: number, high: number) => T.UIO<number>;
   abstract readonly setSeed: (s: string) => T.UIO<void>;
}

export class LiveRandom extends Random {
   private PRNG = new PRNG(this.seed);

   constructor(private seed: string) {
      super();
   }

   next: T.UIO<number> = T.total(() => this.PRNG.next());

   nextBoolean: T.UIO<boolean> = T.chain_(this.next, (n) => T.total(() => n > 0.5));

   nextInt: T.UIO<number> = T.total(() => this.PRNG.int32());

   nextDouble: T.UIO<number> = T.total(() => this.PRNG.double());

   nextRange: (low: number, high: number) => T.UIO<number> = (low, high) =>
      T.chain_(this.next, (n) => T.total(() => (high - low) * n + low));

   nextIntBetween: (low: number, high: number) => T.UIO<number> = (low, high) =>
      T.chain_(this.next, (n) => T.total(() => Math.floor((high - low + 1) * n + low)));

   setSeed = (s: string) =>
      T.total(() => {
         this.PRNG.setSeed(s);
      });
}

export const defaultRandom = new LiveRandom(String(Math.random()));

export const HasRandom = has(Random);
export type HasRandom = HasTag<typeof HasRandom>;

export const next = asksServiceM(HasRandom)((_) => _.next);

export const nextBoolean = asksServiceM(HasRandom)((_) => _.nextBoolean);

export const nextIntBetween = (low: number, high: number) =>
   asksServiceM(HasRandom)((_) => _.nextIntBetween(low, high));

export const nextInt = asksServiceM(HasRandom)((_) => _.nextInt);

export const nextDouble = asksServiceM(HasRandom)((_) => _.nextDouble);

export const nextRange = (low: number, high: number) => asksServiceM(HasRandom)((_) => _.nextRange(low, high));

export const setSeed = (seed: string) => asksServiceM(HasRandom)((_) => _.setSeed(seed));

export const withSeed = (seed: string) => replaceService(HasRandom, () => new LiveRandom(seed));
