import { identity } from "@principia/core/Function";

import type { Effect } from "../Effect";
import { orDieWith_ } from "./orDieWith";

export const orDie = <R, E, A>(ma: Effect<R, E, A>): Effect<R, never, A> => orDieWith_(ma, identity);
