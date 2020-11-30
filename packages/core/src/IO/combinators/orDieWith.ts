import { die, foldM_, pure } from "../_core";
import type { IO } from "../model";

export function orDieWith_<R, E, A>(ma: IO<R, E, A>, f: (e: E) => unknown): IO<R, never, A> {
  return foldM_(ma, (e) => die(f(e)), pure);
}

export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: IO<R, E, A>) => IO<R, never, A> {
  return (ma) => orDieWith_(ma, f);
}
