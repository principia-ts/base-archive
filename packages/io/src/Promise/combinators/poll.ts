import type { FIO, UIO } from "../../IO/core";
import type { Promise } from "../model";
import type { Option } from "@principia/base/data/Option";

import { none, some } from "@principia/base/data/Option";

import * as I from "../../IO/core";

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
