import { flow } from "@principia/prelude";

import * as A from "../../../Array";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../AIO";
import { Transducer } from "./model";

/**
 * Transforms the inputs of this transducer.
 */
export function contramap_<R, E, I, O, J>(
  fa: Transducer<R, E, I, O>,
  f: (j: J) => I
): Transducer<R, E, J, O> {
  return new Transducer(M.map_(fa.push, (push) => (input) => push(O.map_(input, A.map(f)))));
}

/**
 * Transforms the inputs of this transducer.
 */
export function contramap<I, J>(
  f: (j: J) => I
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, J, O> {
  return (fa) => contramap_(fa, f);
}

/**
 * Effectually transforms the inputs of this transducer
 */
export function contramapM_<R, E, I, O, R1, E1, J>(
  fa: Transducer<R, E, I, O>,
  f: (j: J) => T.AIO<R1, E1, I>
): Transducer<R & R1, E | E1, J, O> {
  return new Transducer(
    M.map_(fa.push, (push) => (is) =>
      O.fold_(
        is,
        () => push(O.none()),
        flow(
          T.foreach(f),
          T.chain((in_) => push(O.some(in_)))
        )
      )
    )
  );
}

/**
 * Effectually transforms the inputs of this transducer
 */
export function contramapM<R1, E1, I, J>(
  f: (j: J) => T.AIO<R1, E1, I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, J, O> {
  return (fa) => contramapM_(fa, f);
}
