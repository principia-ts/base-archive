import { identity } from "../../../Function";
import type { AIO } from "../model";
import { orDieWith_ } from "./orDieWith";

export function orDie<R, E, A>(ma: AIO<R, E, A>): AIO<R, never, A> {
  return orDieWith_(ma, identity);
}
