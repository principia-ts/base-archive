import * as DSL from "../DSL";
import type * as E from "../Either";
import { identity } from "../Function";
import { NoSuchElementException } from "../GlobalExceptions";
import type { Has, Tag } from "../Has";
import type * as O from "../Option";
import { isEither, isOption, isTag } from "../Utils";
import { fail, succeed } from "./constructors";
import type { Async } from "./model";
import { Monad } from "./monad";
import { asksService } from "./service";

const adapter: {
  <A>(_: Tag<A>): DSL.GenHKT<Async<Has<A>, never, A>, A>;
  <A>(_: O.Option<A>): DSL.GenHKT<Async<unknown, NoSuchElementException, A>, A>;
  <E, A>(_: O.Option<A>, onNone: () => E): DSL.GenHKT<Async<unknown, E, A>, A>;
  <E, A>(_: E.Either<E, A>): DSL.GenHKT<Async<unknown, E, A>, A>;
  <R, E, A>(_: Async<R, E, A>): DSL.GenHKT<Async<R, E, A>, A>;
} = (_: any, __?: any) => {
  if (isTag(_)) {
    return new DSL.GenHKT(asksService(_)(identity));
  }
  if (isEither(_)) {
    return new DSL.GenHKT(_._tag === "Left" ? fail(_.left) : succeed(_.right));
  }
  if (isOption(_)) {
    return new DSL.GenHKT(
      _._tag === "None"
        ? fail(__ ? __() : new NoSuchElementException("Async.gen"))
        : succeed(_.value)
    );
  }
  return new DSL.GenHKT(_);
};

export const gen = DSL.genF(Monad, { adapter });
