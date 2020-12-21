import type { IO } from "../../IO";
import type { _E, _R } from "@principia/base/util/types";
import { Either, isEither } from "@principia/base/data/Either";
import { Has, isTag, Tag } from "@principia/base/data/Has";
import { isOption, Option } from "@principia/base/data/Option";
import type { NoSuchElementException } from "@principia/base/util/GlobalExceptions";

import { identity } from "@principia/base/data/Function";

import { getOrFail } from "../../IO/combinators/getOrFail";
import { chain_, fromEffect, fromEither, Managed, succeed } from "../core";
import { asksService } from "./service";
import { suspend } from "./suspend";

export class GenManaged<R, E, A> {
  readonly _R!: (_R: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;

  constructor(readonly M: Managed<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenManaged<R, E, A>, A, any> {
    return yield this;
  }
}

const adapter = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenManaged(asksService(_)(identity));
  }
  if (isEither(_)) {
    return new GenManaged(fromEither(() => _));
  }
  if (isOption(_)) {
    return new GenManaged(
      __ ? (_._tag === "None" ? fail(__()) : succeed(_.value)) : fromEffect(getOrFail(_))
    );
  }
  if (_ instanceof Managed) {
    return new GenManaged(_);
  }
  return new GenManaged(fromEffect(_));
};

export function gen<R0, E0, A0>(): <T extends GenManaged<R0, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: IO<R, E, A>): GenManaged<R, E, A>;
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>;
export function gen<E0, A0>(): <T extends GenManaged<any, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: IO<R, E, A>): GenManaged<R, E, A>;
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>;
export function gen<A0>(): <T extends GenManaged<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: IO<R, E, A>): GenManaged<R, E, A>;
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>;
export function gen<T extends GenManaged<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: IO<R, E, A>): GenManaged<R, E, A>;
  }) => Generator<T, AEff, any>
): Managed<_R<T>, _E<T>, AEff>;
export function gen(...args: any[]): any {
  function gen_<Eff extends GenManaged<any, any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): Managed<_R<Eff>, _E<Eff>, AEff> {
    return suspend(() => {
      const iterator = f(adapter as any);
      const state = iterator.next();

      function run(
        state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
      ): Managed<any, any, AEff> {
        if (state.done) {
          return succeed(state.value);
        }
        return chain_(state.value.M, (val) => {
          const next = iterator.next(val);
          return run(next);
        });
      }

      return run(state);
    });
  }

  if (args.length === 0) {
    return (f: any) => gen_(f);
  }
  return gen_(args[0]);
}
