import * as M from "../../Managed";
import * as T from "../../Task";
import { Transducer } from "./model";

/**
 * Transforms the errors of this transducer.
 */
export function mapError_<R, E, I, O, E1>(pab: Transducer<R, E, I, O>, f: (e: E) => E1): Transducer<R, E1, I, O> {
   return new Transducer(M.map_(pab.push, (push) => (is) => T.mapError_(push(is), f)));
}

/**
 * Transforms the errors of this transducer.
 */
export function mapError<E, E1>(f: (e: E) => E1): <R, I, O>(pab: Transducer<R, E, I, O>) => Transducer<R, E1, I, O> {
   return (pab) => mapError_(pab, f);
}
