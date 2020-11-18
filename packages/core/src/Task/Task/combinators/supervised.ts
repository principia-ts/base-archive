import type { Supervisor } from "../../Supervisor";
import type { Task } from "../model";
import { SuperviseInstruction } from "../model";

/**
 * ```haskell
 * supervised_ :: (Task r e a, Supervisor _) -> Task r e a
 * ```
 *
 * Returns a task with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised_<R, E, A>(
  fa: Task<R, E, A>,
  supervisor: Supervisor<any>
): Task<R, E, A> {
  return new SuperviseInstruction(fa, supervisor);
}

/**
 * ```haskell
 * supervised :: Supervisor _ -> Task r e a -> Task r e a
 * ```
 *
 * Returns a task with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised(
  supervisor: Supervisor<any>
): <R, E, A>(fa: Task<R, E, A>) => Task<R, E, A> {
  return (fa) => supervised_(fa, supervisor);
}
