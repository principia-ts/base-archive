import * as A from "../../../Array/_core";
import type { AIO } from "../model";

export function replicate(n: number): <R, E, A>(ma: AIO<R, E, A>) => readonly AIO<R, E, A>[] {
  return (ma) => A.map_(A.range(0, n), () => ma);
}
