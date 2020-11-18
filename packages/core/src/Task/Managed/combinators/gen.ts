import type { Either } from "../../../Either";
import { identity } from "../../../Function";
import type { NoSuchElementException } from "../../../GlobalExceptions";
import type { Has, Tag } from "../../../Has";
import type { Option } from "../../../Option";
import { isEither, isOption, isTag } from "../../../Utils/guards";
import type { _E, _R } from "../../../Utils/infer";
import type { Task } from "../../Task";
import { getOrFail } from "../../Task/combinators/getOrFail";
import { fromTask, succeed } from "../constructors";
import { Managed } from "../model";
import { chain_ } from "../monad";
import { fromEither } from "./from";
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
      __ ? (_._tag === "None" ? fail(__()) : succeed(_.value)) : fromTask(getOrFail(_))
    );
  }
  if (_ instanceof Managed) {
    return new GenManaged(_);
  }
  return new GenManaged(fromTask(_));
};

export function gen<R0, E0, A0>(): <T extends GenManaged<R0, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: Task<R, E, A>): GenManaged<R, E, A>;
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>;
export function gen<E0, A0>(): <T extends GenManaged<any, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: Task<R, E, A>): GenManaged<R, E, A>;
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>;
export function gen<A0>(): <T extends GenManaged<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: Task<R, E, A>): GenManaged<R, E, A>;
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>;
export function gen<T extends GenManaged<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenManaged<unknown, E, A>;
    <A>(_: Option<A>): GenManaged<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenManaged<unknown, E, A>;
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>;
    <R, E, A>(_: Task<R, E, A>): GenManaged<R, E, A>;
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
