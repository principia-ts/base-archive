import type { Managed } from "../../Managed";
import { fork } from "../../Managed/combinators";
import type { Executor } from "../Fiber";
import type { IO } from "../model";
import { toManaged } from "./toManaged";

export function forkManaged<R, E, A>(ma: IO<R, E, A>): Managed<R, never, Executor<E, A>> {
  return fork(toManaged()(ma));
}
