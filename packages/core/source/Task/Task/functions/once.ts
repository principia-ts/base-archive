import type { Option } from "../../../Option";
import { getAndSet_, makeRef } from "../../XRef";
import * as T from "../core";
import type { Task, UIO } from "../model";

export const once = <R, E, A>(task: Task<R, E, A>): UIO<Task<R, E, Option<A>>> =>
   T.map_(makeRef(true), (ref) => T.whenM_(task, getAndSet_(ref, false)));
