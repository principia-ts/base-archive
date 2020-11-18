import * as T from "../_core";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { RIO, Task } from "../model";

export function option<R, E, A>(task: Task<R, E, A>): RIO<R, Option<A>> {
  return T.foldM_(
    task,
    () => T.succeed(O.none()),
    (a) => T.succeed(O.some(a))
  );
}
