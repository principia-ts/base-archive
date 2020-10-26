import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as T from "../core";
import type { RIO, Task } from "../model";

export const option = <R, E, A>(task: Task<R, E, A>): RIO<R, Option<A>> =>
   T.foldM_(
      task,
      () => T.succeed(O.none()),
      (a) => T.succeed(O.some(a))
   );
