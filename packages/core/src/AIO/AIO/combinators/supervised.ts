import type { Supervisor } from "../../Supervisor";
import type { AIO } from "../model";
import { SuperviseInstruction } from "../model";

/**
 * ```haskell
 * supervised_ :: (AIO r e a, Supervisor _) -> AIO r e a
 * ```
 *
 * Returns an AIO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised_<R, E, A>(fa: AIO<R, E, A>, supervisor: Supervisor<any>): AIO<R, E, A> {
  return new SuperviseInstruction(fa, supervisor);
}

/**
 * ```haskell
 * supervised :: Supervisor _ -> AIO r e a -> AIO r e a
 * ```
 *
 * Returns an AIO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised(
  supervisor: Supervisor<any>
): <R, E, A>(fa: AIO<R, E, A>) => AIO<R, E, A> {
  return (fa) => supervised_(fa, supervisor);
}
