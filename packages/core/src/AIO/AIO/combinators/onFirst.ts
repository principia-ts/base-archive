import * as T from "../_core";
import type { AIO } from "../model";

export const onFirst = <R, E, A>(aio: AIO<R, E, A>): AIO<R, E, readonly [A, R]> =>
  T.zip_(aio, T.ask<R>());
