import type { AIO } from "../model";
import { orElse_ } from "./orElse";

export function eventually<R, E, A>(ma: AIO<R, E, A>): AIO<R, never, A> {
  return orElse_(ma, () => eventually(ma));
}
