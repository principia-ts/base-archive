import type { Supervisor } from "../../Supervisor";
import type { Effect } from "../model";
import { SuperviseInstruction } from "../model";

/**
 * ```haskell
 * supervised_ :: (Effect r e a, Supervisor _) -> Effect r e a
 * ```
 *
 * Returns an effect with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const supervised_ = <R, E, A>(fa: Effect<R, E, A>, supervisor: Supervisor<any>): Effect<R, E, A> =>
   new SuperviseInstruction(fa, supervisor);

/**
 * ```haskell
 * supervised :: Supervisor _ -> Effect r e a -> Effect r e a
 * ```
 *
 * Returns an effect with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const supervised = (supervisor: Supervisor<any>) => <R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> =>
   supervised_(fa, supervisor);
