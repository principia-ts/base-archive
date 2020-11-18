import type { Option } from "../../../Option";
import { none, some } from "../../../Option";
import * as T from "../../Task/_core";
import type { EIO, IO } from "../../Task/model";
import type { XPromise } from "../model";

/**
 * Checks for completion of this Promise. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export function poll<E, A>(promise: XPromise<E, A>): IO<Option<EIO<E, A>>> {
  return T.total(() => {
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
