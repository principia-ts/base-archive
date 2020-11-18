import type { Executor } from "../../Fiber";
import type { Managed } from "../../Managed";
import { fork } from "../../Managed/combinators";
import type { Task } from "../model";
import { toManaged } from "./toManaged";

export function forkManaged<R, E, A>(ma: Task<R, E, A>): Managed<R, never, Executor<E, A>> {
  return fork(toManaged()(ma));
}
