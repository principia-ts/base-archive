import * as A from "@principia/core/Array";
import type { NonEmptyArray } from "@principia/core/NonEmptyArray";
import * as NEA from "@principia/core/NonEmptyArray";

import type { Effect } from "../Effect";
import { orElse_ } from "./orElse";

export const firstSuccess = <R, E, A>(fas: NonEmptyArray<Effect<R, E, A>>) =>
   A.reduce_(NEA.tail(fas), NEA.head(fas), (b, a) => orElse_(b, () => a));
