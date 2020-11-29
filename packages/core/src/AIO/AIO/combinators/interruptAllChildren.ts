import { interruptAll } from "../../Fiber";
import type { AIO } from "../model";
import { ensuringChildren_ } from "./ensuringChildren";

export const interruptAllChildren = <R, E, A>(aio: AIO<R, E, A>) =>
  ensuringChildren_(aio, interruptAll);
