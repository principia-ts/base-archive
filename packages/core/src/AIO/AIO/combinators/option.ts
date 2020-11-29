import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as T from "../_core";
import type { AIO, RIO } from "../model";

export function option<R, E, A>(aio: AIO<R, E, A>): RIO<R, Option<A>> {
  return T.foldM_(
    aio,
    () => T.succeed(O.none()),
    (a) => T.succeed(O.some(a))
  );
}
