import * as T from "../_core";
import type { AIO } from "../model";

export const mapPartial_ = <R, E, A, E1, B>(
  aio: AIO<R, E, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E1
): AIO<R, E | E1, B> => T.chain_(aio, (a) => T.partial_(() => f(a), onThrow));

export const mapPartial = <E1>(onThrow: (u: unknown) => E1) => <A, B>(f: (a: A) => B) => <R, E>(
  aio: AIO<R, E, A>
): AIO<R, E | E1, B> => mapPartial_(aio, f, onThrow);
