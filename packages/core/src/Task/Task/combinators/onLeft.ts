import * as T from "../_core";
import type { Either } from "../../../Either";
import type { Task } from "../model";
import { joinEither_ } from "./join";

export const onLeft = <C>() => <R, E, A>(task: Task<R, E, A>): Task<Either<R, C>, E, Either<A, C>> =>
   joinEither_(task, T.ask<C>());
