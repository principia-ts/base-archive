import { interruptAll } from "../../Fiber";
import type { Task } from "../model";
import { ensuringChildren_ } from "./ensuringChildren";

export const interruptAllChildren = <R, E, A>(task: Task<R, E, A>) => ensuringChildren_(task, interruptAll);
