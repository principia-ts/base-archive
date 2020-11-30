/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { HasTag } from "../../Has";
import { tag } from "../../Has";
import * as I from "../_core";
import { asksServiceM, replaceService } from "../combinators/service";
import { PRNG } from "./Alea";

export const URI = Symbol();

export abstract class Random {
  readonly _URI!: typeof URI;

  abstract readonly next: I.UIO<number>;
  abstract readonly nextBoolean: I.UIO<boolean>;
  abstract readonly nextInt: I.UIO<number>;
  abstract readonly nextDouble: I.UIO<number>;
  abstract readonly nextRange: (low: number, high: number) => I.UIO<number>;
  abstract readonly nextIntBetween: (low: number, high: number) => I.UIO<number>;
  abstract readonly setSeed: (s: string) => I.UIO<void>;
}

export class LiveRandom extends Random {
  private PRNG = new PRNG(this.seed);

  constructor(private seed: string) {
    super();
  }

  next: I.UIO<number> = I.total(() => this.PRNG.next());

  nextBoolean: I.UIO<boolean> = I.chain_(this.next, (n) => I.total(() => n > 0.5));

  nextInt: I.UIO<number> = I.total(() => this.PRNG.int32());

  nextDouble: I.UIO<number> = I.total(() => this.PRNG.double());

  nextRange: (low: number, high: number) => I.UIO<number> = (low, high) =>
    I.chain_(this.next, (n) => I.total(() => (high - low) * n + low));

  nextIntBetween: (low: number, high: number) => I.UIO<number> = (low, high) =>
    I.chain_(this.next, (n) => I.total(() => Math.floor((high - low + 1) * n + low)));

  setSeed = (s: string) =>
    I.total(() => {
      this.PRNG.setSeed(s);
    });
}

export const defaultRandom = new LiveRandom(String(Math.random()));

export const HasRandom = tag(Random);
export type HasRandom = HasTag<typeof HasRandom>;

export const next = asksServiceM(HasRandom)((_) => _.next);

export const nextBoolean = asksServiceM(HasRandom)((_) => _.nextBoolean);

export function nextIntBetween(low: number, high: number) {
  return asksServiceM(HasRandom)((_) => _.nextIntBetween(low, high));
}

export const nextInt = asksServiceM(HasRandom)((_) => _.nextInt);

export const nextDouble = asksServiceM(HasRandom)((_) => _.nextDouble);

export function nextRange(low: number, high: number) {
  return asksServiceM(HasRandom)((_) => _.nextRange(low, high));
}

export function setSeed(seed: string) {
  return asksServiceM(HasRandom)((_) => _.setSeed(seed));
}

export function withSeed(seed: string) {
  return replaceService(HasRandom, () => new LiveRandom(seed));
}
