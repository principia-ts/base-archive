import * as O from "../../Option";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import type { Cause } from "../Exit/Cause";
import * as T from "../Task/_core";
import type { FiberId } from "./FiberId";
import type { SyntheticFiber } from "./model";

export const done = <E, A>(exit: Exit<E, A>): SyntheticFiber<E, A> => ({
   _tag: "SyntheticFiber",
   await: T.pure(exit),
   getRef: (ref) => T.pure(ref.initial),
   inheritRefs: T.unit(),
   interruptAs: () => T.pure(exit),
   poll: T.pure(O.some(exit))
});

export const succeed = <A>(a: A): SyntheticFiber<never, A> => done(Ex.succeed(a));

export const fail = <E>(e: E): SyntheticFiber<E, never> => done(Ex.fail(e));

export const halt = <E>(cause: Cause<E>) => done(Ex.failure(cause));

export const interruptAs = (id: FiberId) => done(Ex.interrupt(id));
