import { die, foldM_, pure } from "../_core";
import type { AIO } from "../model";

export function orDieWith_<R, E, A>(ma: AIO<R, E, A>, f: (e: E) => unknown): AIO<R, never, A> {
  return foldM_(ma, (e) => die(f(e)), pure);
}

export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: AIO<R, E, A>) => AIO<R, never, A> {
  return (ma) => orDieWith_(ma, f);
}
