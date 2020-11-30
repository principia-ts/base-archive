import type { IO } from "../model";
import { orElse_ } from "./orElse";

export function eventually<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  return orElse_(ma, () => eventually(ma));
}
