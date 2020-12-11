import type { Chunk } from "../../Chunk";
import * as E from "../../Either";
import type { HasClock } from "../../IO/Clock";
import type { Schedule } from "../../IO/Schedule";
import * as O from "../../Option";
import type { Stream } from "../model";
import type { Transducer } from "../Transducer/model";
import { aggregateAsyncWithinEither_ } from "./aggregateAsyncWithinEither";
import { filterMap_ } from "./filterMap";

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin<O, R1, E1, P>(
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, P> {
  return (stream) => aggregateAsyncWithin_(stream, transducer, schedule);
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): Stream<R & R1 & HasClock, E | E1, P> {
  return filterMap_(
    aggregateAsyncWithinEither_(stream, transducer, schedule),
    E.fold(() => O.none(), O.some)
  );
}
