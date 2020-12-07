import type { Chunk } from "../Chunk";
import * as C from "../Chunk";
import { flow, pipe } from "../Function";
import * as I from "../IO";
import * as Ca from "../IO/Cause";
import type { Exit } from "../IO/Exit";
import * as Ex from "../IO/Exit";
import type { Option } from "../Option";
import * as O from "../Option";
import type { Pull } from "./Pull";

export type Take<E, A> = Exit<Option<E>, Chunk<A>>;

export function chunk<A>(as: Chunk<A>): Take<never, A> {
  return Ex.succeed(as);
}

export function halt<E>(cause: Ca.Cause<E>): Take<E, never> {
  return Ex.failure(pipe(cause, Ca.map(O.some)));
}

export const end: Take<never, never> = Ex.fail(O.none());

export function done<E, A>(take: Take<E, A>): I.FIO<Option<E>, Chunk<A>> {
  return I.done(take);
}

export function fromPull<R, E, O>(pull: Pull<R, E, O>): I.IO<R, never, Take<E, O>> {
  return pipe(
    pull,
    I.foldCause(
      (c) =>
        pipe(
          Ca.sequenceCauseOption(c),
          O.fold(() => end, halt)
        ),
      chunk
    )
  );
}

export function tap_<E, A, R, E1>(
  take: Take<E, A>,
  f: (as: Chunk<A>) => I.IO<R, E1, any>
): I.IO<R, E1, void> {
  return I.asUnit(Ex.foreachEffect_(take, f));
}

export function tap<A, R, E1>(
  f: (as: Chunk<A>) => I.IO<R, E1, any>
): <E>(take: Exit<Option<E>, Chunk<A>>) => I.IO<R, E1, void> {
  return (take) => tap_(take, f);
}

export function foldM_<E, A, R, E1, Z>(
  take: Take<E, A>,
  end: () => I.IO<R, E1, Z>,
  error: (cause: Ca.Cause<E>) => I.IO<R, E1, Z>,
  value: (chunk: Chunk<A>) => I.IO<R, E1, Z>
): I.IO<R, E1, Z> {
  return Ex.foldM_(take, flow(Ca.sequenceCauseOption, O.fold(end, error)), value);
}

export function foldM<E, A, R, E1, Z>(
  end: () => I.IO<R, E1, Z>,
  error: (cause: Ca.Cause<E>) => I.IO<R, E1, Z>,
  value: (chunk: Chunk<A>) => I.IO<R, E1, Z>
): (take: Take<E, A>) => I.IO<R, E1, Z> {
  return (take) => foldM_(take, end, error, value);
}

export function map_<E, A, B>(take: Take<E, A>, f: (a: A) => B): Take<E, B> {
  return Ex.map_(take, C.map(f));
}

export function map<A, B>(
  f: (a: A) => B
): <E>(take: Exit<Option<E>, Chunk<A>>) => Exit<Option<E>, Chunk<B>> {
  return (take) => map_(take, f);
}
