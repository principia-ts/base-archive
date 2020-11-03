import { ForkInstruction } from "./internal/Concrete";
import type { Async } from "./model";
import type { AsyncDriver } from "./run";

export const fork = <R, E, A>(task: Async<R, E, A>): Async<R, never, AsyncDriver<E, A>> => new ForkInstruction(task);
