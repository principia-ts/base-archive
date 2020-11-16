import type { Predicate, Refinement } from "@principia/prelude";

import * as L from "../../../List";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
import { Transducer } from "./model";

export function filter_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<O>): Transducer<R, E, I, O>;
export function filter_<R, E, I, O, B extends O>(
   fa: Transducer<R, E, I, O>,
   refinement: Refinement<O, B>
): Transducer<R, E, I, B>;
export function filter_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<O>): Transducer<R, E, I, O> {
   return new Transducer(M.map_(fa.push, (push) => (is) => T.map_(push(is), L.filter(predicate))));
}

export function filter<O>(predicate: Predicate<O>): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O>;
export function filter<O, B extends O>(
   refinement: Refinement<O, B>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, B>;
export function filter<O>(predicate: Predicate<O>): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O> {
   return (fa) => filter_(fa, predicate);
}

export function filterInput_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<I>): Transducer<R, E, I, O>;
export function filterInput_<R, E, I, O, I1 extends I>(
   fa: Transducer<R, E, I, O>,
   refinement: Refinement<I, I1>
): Transducer<R, E, I1, O>;
export function filterInput_<R, E, I, O>(fa: Transducer<R, E, I, O>, predicate: Predicate<I>): Transducer<R, E, I, O> {
   return new Transducer(M.map_(fa.push, (push) => (is) => push(O.map_(is, L.filter(predicate)))));
}

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
