import * as I from "../../IO/_core";
import type { FIO, UIO } from "../../IO/model";
import type { Option } from "../../Option";
import { none, some } from "../../Option";
import type { Promise } from "../model";

/**
 * Checks for completion of this Promise. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export function poll<E, A>(promise: Promise<E, A>): UIO<Option<FIO<E, A>>> {
  return I.total(() => {
    const state = promise.state.get;

    switch (state._tag) {
      case "Done": {
        return some(state.value);
      }
      case "Pending": {
        return none();
      }
    }
  });
}
