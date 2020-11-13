import * as A from "../../../Array";
import type { Task } from "../model";

export function replicate(n: number): <R, E, A>(ma: Task<R, E, A>) => readonly Task<R, E, A>[] {
   return (ma) => A.map_(A.range(0, n), () => ma);
}
