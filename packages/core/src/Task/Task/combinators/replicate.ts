import * as A from "../../../Array";
import type { Task } from "../model";

export const replicate = (n: number) => <R, E, A>(ma: Task<R, E, A>) => A.map_(A.range(0, n), () => ma);
