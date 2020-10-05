import { pipe } from "@principia/core/Function";
import { Maybe } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import * as C from "../../Cause";
import * as T from "../../Effect";
import * as Ex from "../../Exit";
import { Exit } from "../../Exit";
import { Pull } from "./Pull";

export type Take<E, A> = Exit<Maybe<E>, ReadonlyArray<A>>;

export const chunk = <A>(as: ReadonlyArray<A>): Take<never, A> => Ex.succeed(as);

export const halt = <E>(cause: C.Cause<E>): Take<E, never> =>
   Ex.failure(pipe(cause, C.map(Mb.just)));

export const end: Take<never, never> = Ex.fail(Mb.nothing());

export const done = <E, A>(take: Take<E, A>) => T.done(take);

export const fromPull = <R, E, O>(pull: Pull<R, E, O>): T.Effect<R, never, Take<E, O>> =>
   pipe(
      pull,
      T.foldCause(
         (c) =>
            pipe(
               C.sequenceCauseMaybe(c),
               Mb.fold(() => end, halt)
            ),
         chunk
      )
   );
