import type { Option } from "../../Option";
import * as O from "../../Option";
import { chain_, fail, pure, total } from "../_core";
import type { FIO } from "../model";

/**
 * Lifts an `Option` into an `IO` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromOption<A>(m: () => Option<A>): FIO<Option<never>, A> {
  return chain_(total(m), (ma) => (ma._tag === "None" ? fail(O.none()) : pure(ma.value)));
}
