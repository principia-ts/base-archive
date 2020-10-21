import * as O from "../../../Option";
import type { Effect } from "../core";
import { chain_, fail, succeed, total } from "../core";

const require__ = <R, E, A>(ma: Effect<R, E, O.Option<A>>, error: () => E) =>
   chain_(
      ma,
      O.fold(() => chain_(total(error), fail), succeed)
   );

const require_ = <E>(error: () => E) => <R, A>(ma: Effect<R, E, O.Option<A>>) => require__(ma, error);

export { require__ as require_, require_ as require };
