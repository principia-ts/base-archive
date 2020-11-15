import { flow } from "@principia/prelude";

import * as L from "../../../List";
import * as O from "../../../Option";
import * as M from "../../Managed";
import { Transducer } from "./model";

export function contramap_<R, E, I, O, J>(fa: Transducer<R, E, I, O>, f: (j: J) => I): Transducer<R, E, J, O> {
   return new Transducer(M.map_(fa.push, (push) => (input) => push(O.map_(input, L.map(f)))));
}

export function contramap<I, J>(f: (j: J) => I): <R, E, O>(fa: Transducer<R, E, I, O>) => Transducer<R, E, J, O> {
   return (fa) => contramap_(fa, f);
}
