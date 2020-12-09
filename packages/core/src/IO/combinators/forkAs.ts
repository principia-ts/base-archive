import { pipe } from "../../Function";
import * as O from "../../Option";
import { chain, fork } from "../_core";
import * as Fiber from "../Fiber";
import * as FiberRef from "../FiberRef";
import type { IO, URIO } from "../model";
import { uninterruptibleMask } from "./interrupt";

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs_<R, E, A>(fa: IO<R, E, A>, name: string): URIO<R, Fiber.Executor<E, A>> {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      Fiber.fiberName,
      FiberRef.set(O.some(name)),
      chain(() => fork(restore(fa)))
    )
  );
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs(name: string): <R, E, A>(ef: IO<R, E, A>) => URIO<R, Fiber.Executor<E, A>> {
  return (ef) => forkAs_(ef, name);
}
