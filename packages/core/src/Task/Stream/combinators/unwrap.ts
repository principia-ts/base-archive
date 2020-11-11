import type * as T from "../../Task";
import { fromTask } from "../constructors";
import type { Stream } from "../model";
import { flatten } from "../monad";

export const unwrap = <R, E, O>(fa: T.Task<R, E, Stream<R, E, O>>): Stream<R, E, O> => flatten(fromTask(fa));
