import * as E from "../Either";
import * as O from "../Option";
import * as X from "../SIO";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Sync Constructors
 * -------------------------------------------
 */

export const succeed: <A>(a: A) => Sync<unknown, never, A> = X.succeed;

export const fail: <E>(e: E) => Sync<unknown, E, never> = X.fail;

export const total: <A>(thunk: () => A) => Sync<unknown, never, A> = X.total;

export const partial_: <E, A>(
  thunk: () => A,
  onThrow: (error: unknown) => E
) => Sync<unknown, E, A> = X.partial_;

export const partial: <E>(
  onThrow: (error: unknown) => E
) => <A>(thunk: () => A) => Sync<unknown, E, A> = X.partial;

export const suspend: <R, E, A>(factory: () => Sync<R, E, A>) => Sync<R, E, A> = X.suspend;

export const fromEither: <E, A>(either: E.Either<E, A>) => Sync<unknown, E, A> = E.fold(
  fail,
  succeed
);

export const fromOption = <E, A>(option: O.Option<A>, onNone: () => E): Sync<unknown, E, A> =>
  O.fold_(option, () => fail(onNone()), succeed);
