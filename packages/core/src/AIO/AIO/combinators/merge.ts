import * as T from "../_core";
import type { AIO } from "../model";

export const merge = <R, E, A>(aio: AIO<R, E, A>): AIO<R, never, A | E> =>
  T.foldM_(aio, T.succeed, T.succeed);
