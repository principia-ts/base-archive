import type { Predicate, Refinement } from "@principia/prelude";
import { flow } from "@principia/prelude";

import * as L from "../../../List";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
import { Transducer } from "./model";

/**
 * Filters the outputs of this transducer.
 */
export function filter_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<O>): Transducer<R, E, I, O>;
export function filter_<R, E, I, O, B extends O>(
   fa: Transducer<R, E, I, O>,
   refinement: Refinement<O, B>
): Transducer<R, E, I, B>;
export function filter_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<O>): Transducer<R, E, I, O> {
   return new Transducer(M.map_(fa.push, (push) => (is) => T.map_(push(is), L.filter(predicate))));
}

/**
 * Filters the outputs of this transducer.
 */
export function filter<O>(predicate: Predicate<O>): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O>;
export function filter<O, B extends O>(
   refinement: Refinement<O, B>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, B>;
export function filter<O>(predicate: Predicate<O>): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O> {
   return (fa) => filter_(fa, predicate);
}

/**
 * Filters the inputs of this transducer.
 */
export function filterInput_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<I>): Transducer<R, E, I, O>;
export function filterInput_<R, E, I, O, I1 extends I>(
   fa: Transducer<R, E, I, O>,
   refinement: Refinement<I, I1>
): Transducer<R, E, I1, O>;
export function filterInput_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<I>): Transducer<R, E, I, O> {
   return new Transducer(M.map_(fa.push, (push) => (is) => push(O.map_(is, L.filter(predicate)))));
}

/**
 * Filters the inputs of this transducer.
 */
export function filterInput<I>(
   predicate: Predicate<I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O>;
export function filterInput<I, I1 extends I>(
   refinement: Refinement<I, I1>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I1, O>;
export function filterInput<I>(
   predicate: Predicate<I>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O> {
   return (fa) => filterInput_(fa, predicate);
}

/**
 * Effectually filters the inputs of this transducer.
 */
export function filterInputM_<R, E, I, O, R1, E1>(
   fa: Transducer<R, E, I, O>,
   predicate: (i: I) => T.Task<R1, E1, boolean>
): Transducer<R & R1, E | E1, I, O> {
   return new Transducer(
      M.map_(fa.push, (push) => (is) =>
         O.fold_(
            is,
            () => push(O.none()),
            flow(
               L.filterTask(predicate),
               T.chain((in_) => push(O.some(in_)))
            )
         )
      )
   );
}

/**
 * Effectually filters the inputs of this transducer.
 */
export function filterInputM<I, R1, E1>(
   predicate: (i: I) => T.Task<R1, E1, boolean>
): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O> {
   return (fa) => filterInputM_(fa, predicate);
}
