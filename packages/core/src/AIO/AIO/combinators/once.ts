import { getAndSet_, make } from "../../XRef";
import * as T from "../_core";
import type { AIO, IO } from "../model";

/**
 * Returns an AIO that will be executed at most once, even if it is
 * evaluated multiple times.
 */
export const once = <R, E, A>(aio: AIO<R, E, A>): IO<AIO<R, E, void>> =>
  T.map_(make(true), (ref) => T.whenM_(aio, getAndSet_(ref, false)));
