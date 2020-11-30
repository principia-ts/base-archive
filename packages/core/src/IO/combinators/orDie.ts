import { identity } from "../../Function";
import type { IO } from "../model";
import { orDieWith_ } from "./orDieWith";

export function orDie<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  return orDieWith_(ma, identity);
}
