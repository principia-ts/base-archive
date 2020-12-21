import type { IO, URIO } from "../core";
import type { Option } from "@principia/base/data/Option";

import * as O from "@principia/base/data/Option";

import * as I from "../core";

export function option<R, E, A>(io: IO<R, E, A>): URIO<R, Option<A>> {
  return I.foldM_(
    io,
    () => I.succeed(O.none()),
    (a) => I.succeed(O.some(a))
  );
}
