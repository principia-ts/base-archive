import * as O from "../../Option";
import * as I from "../_core";
import type { Cause } from "../Cause";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import type { FiberId } from "./FiberId";
import type { SyntheticFiber } from "./model";

export function done<E, A>(exit: Exit<E, A>): SyntheticFiber<E, A> {
  return {
    _tag: "SyntheticFiber",
    await: I.pure(exit),
    getRef: (ref) => I.pure(ref.initial),
    inheritRefs: I.unit(),
    interruptAs: () => I.pure(exit),
    poll: I.pure(O.some(exit))
  };
}

export function succeed<A>(a: A): SyntheticFiber<never, A> {
  return done(Ex.succeed(a));
}

export function fail<E>(e: E): SyntheticFiber<E, never> {
  return done(Ex.fail(e));
}

export function halt<E>(cause: Cause<E>) {
  return done(Ex.failure(cause));
}

export function interruptAs(id: FiberId) {
  return done(Ex.interrupt(id));
}
