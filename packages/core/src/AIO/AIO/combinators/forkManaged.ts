import type { Executor } from "../../Fiber";
import type { Managed } from "../../Managed";
import { fork } from "../../Managed/combinators";
import type { AIO } from "../model";
import { toManaged } from "./toManaged";

export function forkManaged<R, E, A>(ma: AIO<R, E, A>): Managed<R, never, Executor<E, A>> {
  return fork(toManaged()(ma));
}
