import type { Fiber } from "../core";

import { flow } from "@principia/base/data/Function";

import * as M from "../../Managed/core";
import * as I from "../_internal/io";
import { interrupt } from "./interrupt";

export const toManaged: <E, A>(fiber: Fiber<E, A>) => M.UManaged<Fiber<E, A>> = flow(
  I.succeed,
  M.make(interrupt)
);
