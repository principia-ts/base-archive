import type { IO } from "../core";

import * as A from "@principia/base/data/Array";

export function replicate(n: number): <R, E, A>(ma: IO<R, E, A>) => readonly IO<R, E, A>[] {
  return (ma) => A.map_(A.range(0, n), () => ma);
}
