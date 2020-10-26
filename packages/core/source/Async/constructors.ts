import type { Either } from "../Either";
import {
   AsyncInstruction,
   FailInstruction,
   PartialSyncInstruction,
   PureInstruction,
   TotalInstruction
} from "./internal/Concrete";
import type { Async } from "./model";

export const total = <A>(thunk: () => A): Async<unknown, never, A> => new TotalInstruction(thunk);

export const succeed = <A>(a: A): Async<unknown, never, A> => new PureInstruction(a);

export const fail = <E>(e: E): Async<unknown, E, never> => new FailInstruction(e);

export const partial_ = <E, A>(thunk: () => A, onThrow: (error: unknown) => E): Async<unknown, E, A> =>
   new PartialSyncInstruction(thunk, onThrow);

export const partial = <E>(onThrow: (error: unknown) => E) => <A>(thunk: () => A): Async<unknown, E, A> =>
   partial_(thunk, onThrow);

export type AsyncCallback<E, A> = (resolve: (_: Either<E, A>) => void) => void;

export const async = <R, E, A>(register: (resolve: (_: Async<R, E, A>) => void) => void): Async<R, E, A> =>
   new AsyncInstruction(register);
