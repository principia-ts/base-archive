import { flow } from "@principia/prelude";

import * as M from "../../Managed/_core";
import * as T from "../_internal/aio";
import type { Fiber } from "../model";
import { interrupt } from "./interrupt";

export const toManaged: <E, A>(fiber: Fiber<E, A>) => M.IO<Fiber<E, A>> = flow(
  T.succeed,
  M.make(interrupt)
);
