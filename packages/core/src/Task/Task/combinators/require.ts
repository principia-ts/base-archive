import type { Task } from "../_core";
import { chain_, fail, succeed, total } from "../_core";
import * as O from "../../../Option";

export const require_ = <R, E, A>(ma: Task<R, E, O.Option<A>>, error: () => E) =>
   chain_(
      ma,
      O.fold(() => chain_(total(error), fail), succeed)
   );

const _require = <E>(error: () => E) => <R, A>(ma: Task<R, E, O.Option<A>>) => require_(ma, error);

export { _require as require };
