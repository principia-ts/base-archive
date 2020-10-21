import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as C from "../../Cause";
import * as T from "../../Effect";
import type { Exit } from "../../Exit";
import * as Ex from "../../Exit";
import type { Pull } from "./Pull";

export type Take<E, A> = Exit<Option<E>, ReadonlyArray<A>>;

export const chunk = <A>(as: ReadonlyArray<A>): Take<never, A> => Ex.succeed(as);

export const halt = <E>(cause: C.Cause<E>): Take<E, never> => Ex.failure(pipe(cause, C.map(O.some)));

export const end: Take<never, never> = Ex.fail(O.none());

export const done = <E, A>(take: Take<E, A>) => T.done(take);

export const fromPull = <R, E, O>(pull: Pull<R, E, O>): T.Effect<R, never, Take<E, O>> =>
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
