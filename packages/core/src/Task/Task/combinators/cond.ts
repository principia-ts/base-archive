import { chain_, suspend } from "../_core";
import type { RIO, Task } from "../model";

export const cond_ = <R, R1, E, A>(
   b: boolean,
   onTrue: () => RIO<R, A>,
   onFalse: () => RIO<R1, E>
): Task<R & R1, E, A> => suspend((): Task<R & R1, E, A> => (b ? onTrue() : chain_(onFalse(), fail)));

export const cond = <R, R1, E, A>(onTrue: () => RIO<R, A>, onFalse: () => RIO<R1, E>) => (
   b: boolean
): Task<R & R1, E, A> => cond_(b, onTrue, onFalse);
