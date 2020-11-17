import { Executor } from "../../Fiber";
import { Managed } from "../../Managed";
import { fork } from "../../Managed/combinators";
import { Task } from "../model";
import { toManaged } from "./toManaged";

export function forkManaged<R, E, A>(ma: Task<R, E, A>): Managed<R, never, Executor<E, A>> {
   return fork(toManaged()(ma));
}
