import { chain_, suspend } from "../_core";
import type { AIO, RIO } from "../model";

export function cond_<R, R1, E, A>(
  b: boolean,
  onTrue: () => RIO<R, A>,
  onFalse: () => RIO<R1, E>
): AIO<R & R1, E, A> {
  return suspend((): AIO<R & R1, E, A> => (b ? onTrue() : chain_(onFalse(), fail)));
}

export function cond<R, R1, E, A>(
  onTrue: () => RIO<R, A>,
  onFalse: () => RIO<R1, E>
): (b: boolean) => AIO<R & R1, E, A> {
  return (b) => cond_(b, onTrue, onFalse);
}
