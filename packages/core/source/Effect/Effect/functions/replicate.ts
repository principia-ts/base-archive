import * as A from "../../../Array";
import type { Effect } from "../model";

export const replicate = (n: number) => <R, E, A>(ma: Effect<R, E, A>) => A.map_(A.range(0, n), () => ma);
