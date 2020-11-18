import { flow } from "@principia/prelude";

import * as T from "../_internal/task";
import * as M from "../../Managed/_core";
import type { Fiber } from "../model";
import { interrupt } from "./interrupt";

export const toManaged: <E, A>(fiber: Fiber<E, A>) => M.IO<Fiber<E, A>> = flow(
  T.succeed,
  M.make(interrupt)
);
