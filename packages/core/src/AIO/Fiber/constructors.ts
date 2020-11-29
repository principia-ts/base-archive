import * as O from "../../Option";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import type { Cause } from "../Exit/Cause";
import * as T from "../AIO/_core";
import type { FiberId } from "./FiberId";
import type { SyntheticFiber } from "./model";

export function done<E, A>(exit: Exit<E, A>): SyntheticFiber<E, A> {
  return {
    _tag: "SyntheticFiber",
    await: T.pure(exit),
    getRef: (ref) => T.pure(ref.initial),
    inheritRefs: T.unit(),
    interruptAs: () => T.pure(exit),
    poll: T.pure(O.some(exit))
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
