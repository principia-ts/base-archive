import type { Option } from "../Option";
import * as O from "../Option";
import type * as Ex from "../Task/Exit";
import type { Cause } from "../Task/Exit/Cause";
import * as C from "../Task/Exit/Cause";
import {
   AsyncInstruction,
   FailInstruction,
   PartialSyncInstruction,
   PureInstruction,
   SuspendInstruction,
   TotalInstruction
} from "./internal/Concrete";
import type { Async } from "./model";

export const total = <A>(thunk: () => A): Async<unknown, never, A> => new TotalInstruction(thunk);

export const succeed = <A>(a: A): Async<unknown, never, A> => new PureInstruction(a);

export const unit: Async<unknown, never, void> = succeed(undefined);

export const fail = <E>(e: E): Async<unknown, E, never> => new FailInstruction(C.fail(e));

export const halt = <E>(cause: Cause<E>): Async<unknown, E, never> => new FailInstruction(cause);

export const die = (error: unknown): Async<unknown, never, never> => halt(C.die(error));

export const done = <E = never, A = unknown>(exit: Ex.Exit<E, A>) =>
   suspend(() => {
      switch (exit._tag) {
         case "Success": {
            return succeed(exit.value);
         }
         case "Failure": {
            return halt(exit.cause);
         }
      }
   });

export const partial_ = <E, A>(thunk: () => A, onThrow: (error: unknown) => E): Async<unknown, E, A> =>
   new PartialSyncInstruction(thunk, onThrow);

export const partial = <E>(onThrow: (error: unknown) => E) => <A>(thunk: () => A): Async<unknown, E, A> =>
   partial_(thunk, onThrow);

export const asyncOption = <R, E, A>(
   register: (resolve: (_: Async<R, E, A>) => void) => Option<Async<R, E, A>>
): Async<R, E, A> => new AsyncInstruction(register);

export const async = <R, E, A>(register: (resolve: (_: Async<R, E, A>) => void) => void): Async<R, E, A> =>
   new AsyncInstruction((resolve) => {
      register(resolve);
      return O.none();
   });

export const suspend = <R, E, A>(factory: () => Async<R, E, A>): Async<R, E, A> => new SuspendInstruction(factory);
