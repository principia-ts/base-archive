import { pipe } from "../../Function";
import * as O from "../../Option";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import * as M from "../Managed";
import * as T from "../Task";
import { Stream } from "./model";

export function mapError_<R, E, A, D>(pab: Stream<R, E, A>, f: (e: E) => D) {
   return new Stream(pipe(pab.proc, M.map(T.mapError(O.map(f)))));
}

export function mapError<E, D>(f: (e: E) => D) {
   return <R, A>(pab: Stream<R, E, A>) => mapError_(pab, f);
}

export function mapErrorCause_<R, E, A, E1>(stream: Stream<R, E, A>, f: (e: Cause<E>) => Cause<E1>): Stream<R, E1, A> {
   return new Stream(
      pipe(
         stream.proc,
         M.map(
            T.mapErrorCause((cause) =>
               pipe(
                  C.sequenceCauseOption(cause),
                  O.fold(
                     () => C.fail(O.none()),
                     (c) => C.map_(f(c), O.some)
                  )
               )
            )
         )
      )
   );
}

export function mapErrorCause<E, D>(f: (e: Cause<E>) => Cause<D>): <R, A>(stream: Stream<R, E, A>) => Stream<R, D, A> {
   return (stream) => mapErrorCause_(stream, f);
}
