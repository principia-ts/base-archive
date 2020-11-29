import { identity } from "../../Function";
import type * as T from "../AIO/model";
import { NewFiberRefInstruction } from "../AIO/model";
import type { FiberRef } from "./model";

export function make<A>(
  initial: A,
  onFork: (a: A) => A = identity,
  onJoin: (a: A, a1: A) => A = (_, a) => a
): T.IO<FiberRef<A>> {
  return new NewFiberRefInstruction(initial, onFork, onJoin);
}
