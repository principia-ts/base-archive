import type { Option } from "../../../Option";
import { getAndSet_, makeRef } from "../../XRef";
import * as T from "../core";
import type { IO, Task } from "../model";

export const once = <R, E, A>(task: Task<R, E, A>): IO<Task<R, E, Option<A>>> =>
   T.map_(makeRef(true), (ref) => T.whenM_(task, getAndSet_(ref, false)));
