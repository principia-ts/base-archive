import type { Option } from "../../Option";
import * as O from "../../Option";
import * as I from "../_core";
import type { IO, URIO } from "../model";

export function option<R, E, A>(io: IO<R, E, A>): URIO<R, Option<A>> {
  return I.foldM_(
    io,
    () => I.succeed(O.none()),
    (a) => I.succeed(O.some(a))
  );
}
