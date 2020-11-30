import { flow } from "@principia/prelude";

import * as M from "../../../Managed/_core";
import * as I from "../_internal/io";
import type { Fiber } from "../model";
import { interrupt } from "./interrupt";

export const toManaged: <E, A>(fiber: Fiber<E, A>) => M.IO<Fiber<E, A>> = flow(
  I.succeed,
  M.make(interrupt)
);
