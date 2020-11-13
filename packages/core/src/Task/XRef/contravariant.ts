import * as E from "../../Either";
import { pipe } from "../../Function";
import { bimapEither } from "./bifunctor";
import type { XRef } from "./model";

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export function contramapEither<A, EC, C>(
   f: (_: C) => E.Either<EC, A>
): <EA, EB, B>(_: XRef<EA, EB, A, B>) => XRef<EA | EC, EB, C, B> {
   return (_) =>
      pipe(
         _,
         bimapEither(f, (x) => E.right(x))
      );
}

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export function contramapEither_<A, EC, C, EA, EB, B>(
   _: XRef<EA, EB, A, B>,
   f: (_: C) => E.Either<EC, A>
): XRef<EC | EA, EB, C, B> {
   return contramapEither(f)(_);
}

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap: <A, C>(f: (_: C) => A) => <EA, EB, B>(_: XRef<EA, EB, A, B>) => XRef<EA, EB, C, B> = (f) =>
   contramapEither((c) => E.right(f(c)));

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap_: <EA, EB, B, A, C>(_: XRef<EA, EB, A, B>, f: (_: C) => A) => XRef<EA, EB, C, B> = (_, f) =>
   contramap(f)(_);
