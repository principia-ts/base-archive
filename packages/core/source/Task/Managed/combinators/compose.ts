import { pipe } from "@principia/prelude";

import type { Managed } from "../model";
import { chain } from "../monad";
import { ask, give_ } from "../reader";

export const compose = <R, E, A, R1, E1>(ma: Managed<R, E, A>, that: Managed<R1, E1, R>): Managed<R1, E | E1, A> =>
   pipe(
      ask<R1>(),
      chain((r1) => give_(that, r1)),
      chain((r) => give_(ma, r))
   );
