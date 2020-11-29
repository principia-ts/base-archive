import * as T from "../_core";
import type { AIO } from "../model";

export function onSecond<R, E, A>(aio: AIO<R, E, A>): AIO<R, E, readonly [R, A]> {
  return T.zip_(T.ask<R>(), aio);
}
