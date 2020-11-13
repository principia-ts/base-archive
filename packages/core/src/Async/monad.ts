import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { flow, identity } from "../Function";
import { fail, succeed } from "./constructors";
import { catchAll_ } from "./fold";
import type { Async, URI, V } from "./model";
import { ChainInstruction } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Async
 * -------------------------------------------
 */

export function chain_<R, E, A, Q, D, B>(ma: Async<R, E, A>, f: (a: A) => Async<Q, D, B>): Async<Q & R, D | E, B> {
   return new ChainInstruction(ma, f);
}

export function chain<A, Q, D, B>(f: (a: A) => Async<Q, D, B>): <R, E>(ma: Async<R, E, A>) => Async<Q & R, D | E, B> {
   return (ma) => new ChainInstruction(ma, f);
}

export function flatten<R, E, R1, E1, A>(mma: Async<R, E, Async<R1, E1, A>>): Async<R & R1, E | E1, A> {
   return chain_(mma, identity);
}

export function tap_<R, E, A, Q, D, B>(ma: Async<R, E, A>, f: (a: A) => Async<Q, D, B>): Async<Q & R, D | E, A> {
   return chain_(ma, (a) => chain_(f(a), (_) => succeed(a)));
}

export function tap<A, Q, D, B>(f: (a: A) => Async<Q, D, B>): <R, E>(ma: Async<R, E, A>) => Async<Q & R, D | E, A> {
   return (ma) => tap_(ma, f);
}

export function tapError_<R, E, A, R1, E1, B>(
   async: Async<R, E, A>,
   f: (e: E) => Async<R1, E1, B>
): Async<R & R1, E | E1, A> {
   return catchAll_(async, (e) => chain_(f(e), (_) => fail(e)));
}

export function tapError<E, R1, E1, B>(
   f: (e: E) => Async<R1, E1, B>
): <R, A>(async: Async<R, E, A>) => Async<R & R1, E | E1, A> {
   return (async) => tapError_(async, f);
}

export const Monad: P.Monad<[URI], V> = HKT.instance({
   map_: (fa, f) => chain_(fa, flow(f, succeed)),
   map: (f) => chain(flow(f, succeed)),
   unit,
   flatten
});
