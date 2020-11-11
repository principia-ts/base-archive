import * as A from "../../../Array";
import { flow, pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { Exit } from "../../Exit";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import * as T from "../../Task";
import type { Pull } from "./Pull";

export type Take<E, A> = Exit<Option<E>, ReadonlyArray<A>>;

export const chunk = <A>(as: ReadonlyArray<A>): Take<never, A> => Ex.succeed(as);

export const halt = <E>(cause: C.Cause<E>): Take<E, never> => Ex.failure(pipe(cause, C.map(O.some)));

export const end: Take<never, never> = Ex.fail(O.none());

export const done = <E, A>(take: Take<E, A>) => T.done(take);

export const fromPull = <R, E, O>(pull: Pull<R, E, O>): T.Task<R, never, Take<E, O>> =>
   pipe(
      pull,
      T.foldCause(
         (c) =>
            pipe(
               C.sequenceCauseOption(c),
               O.fold(() => end, halt)
            ),
         chunk
      )
   );

export const tap_ = <E, A, R, E1>(
   take: Take<E, A>,
   f: (as: ReadonlyArray<A>) => T.Task<R, E1, any>
): T.Task<R, E1, void> => T.asUnit(Ex.foreachTask_(take, f));

export const tap = <A, R, E1>(f: (as: ReadonlyArray<A>) => T.Task<R, E1, any>) => <E>(
   take: Take<E, A>
): T.Task<R, E1, void> => tap_(take, f);

export const foldM_ = <E, A, R, E1, Z>(
   take: Take<E, A>,
   end: () => T.Task<R, E1, Z>,
   error: (cause: C.Cause<E>) => T.Task<R, E1, Z>,
   value: (chunk: ReadonlyArray<A>) => T.Task<R, E1, Z>
): T.Task<R, E1, Z> => Ex.foldM_(take, flow(C.sequenceCauseOption, O.fold(end, error)), value);

export const foldM = <E, A, R, E1, Z>(
   end: () => T.Task<R, E1, Z>,
   error: (cause: C.Cause<E>) => T.Task<R, E1, Z>,
   value: (chunk: ReadonlyArray<A>) => T.Task<R, E1, Z>
) => (take: Take<E, A>): T.Task<R, E1, Z> => foldM_(take, end, error, value);

export const map_ = <E, A, B>(take: Take<E, A>, f: (a: A) => B): Take<E, B> => Ex.map_(take, A.map(f));

export const map = <A, B>(f: (a: A) => B) => <E>(take: Take<E, A>) => map_(take, f);
