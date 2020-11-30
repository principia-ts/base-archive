import * as I from "../_core";
import type { IO } from "../model";

export const mapPartial_ = <R, E, A, E1, B>(
  io: IO<R, E, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E1
): IO<R, E | E1, B> => I.chain_(io, (a) => I.partial_(() => f(a), onThrow));

export const mapPartial = <E1>(onThrow: (u: unknown) => E1) => <A, B>(f: (a: A) => B) => <R, E>(
  io: IO<R, E, A>
): IO<R, E | E1, B> => mapPartial_(io, f, onThrow);
