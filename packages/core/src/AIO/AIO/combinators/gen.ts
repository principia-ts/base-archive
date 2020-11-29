import type { Either } from "../../../Either";
import type { NoSuchElementException } from "../../../GlobalExceptions";
import type { Has, Tag } from "../../../Has";
import type { Option } from "../../../Option";
import { isEither, isOption, isTag } from "../../../Utils/guards";
import type { _E, _R } from "../../../Utils/infer";
import { chain_, fail, pure, suspend } from "../_core";
import type { AIO } from "../model";
import { fromEither } from "./from";
import { getOrFail } from "./getOrFail";
import { askService } from "./service";

export class GenAIO<R, E, A> {
  readonly _R!: (_R: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;

  constructor(readonly T: AIO<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenAIO<R, E, A>, A, any> {
    return yield this;
  }
}

const adapter = (_: any, __?: any) => {
  if (isEither(_)) {
    return new GenAIO(fromEither(() => _));
  }
  if (isOption(_)) {
    return new GenAIO(__ ? (_._tag === "None" ? fail(__()) : pure(_.value)) : getOrFail(_));
  }
  if (isTag(_)) {
    return new GenAIO(askService(_));
  }
  return new GenAIO(_);
};

export function gen<R0, E0, A0>(): <T extends GenAIO<R0, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenAIO<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenAIO<unknown, E, A>;
    <A>(_: Option<A>): GenAIO<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenAIO<unknown, E, A>;
    <R, E, A>(_: AIO<R, E, A>): GenAIO<R, E, A>;
  }) => Generator<T, A0, any>
) => AIO<_R<T>, _E<T>, A0>;
export function gen<E0, A0>(): <T extends GenAIO<any, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenAIO<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenAIO<unknown, E, A>;
    <A>(_: Option<A>): GenAIO<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenAIO<unknown, E, A>;
    <R, E, A>(_: AIO<R, E, A>): GenAIO<R, E, A>;
  }) => Generator<T, A0, any>
) => AIO<_R<T>, _E<T>, A0>;
export function gen<A0>(): <T extends GenAIO<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenAIO<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenAIO<unknown, E, A>;
    <A>(_: Option<A>): GenAIO<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenAIO<unknown, E, A>;
    <R, E, A>(_: AIO<R, E, A>): GenAIO<R, E, A>;
  }) => Generator<T, A0, any>
) => AIO<_R<T>, _E<T>, A0>;
export function gen<T extends GenAIO<any, any, any>, A>(
  f: (i: {
    <A>(_: Tag<A>): GenAIO<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenAIO<unknown, E, A>;
    <A>(_: Option<A>): GenAIO<unknown, NoSuchElementException, A>;
    <E, A>(_: Either<E, A>): GenAIO<unknown, E, A>;
    <R, E, A>(_: AIO<R, E, A>): GenAIO<R, E, A>;
  }) => Generator<T, A, any>
): AIO<_R<T>, _E<T>, A>;
export function gen(...args: any[]): any {
  const _gen = <T extends GenAIO<any, any, any>, A>(
    f: (i: any) => Generator<T, A, any>
  ): AIO<_R<T>, _E<T>, A> =>
    suspend(() => {
      const iterator = f(adapter as any);
      const state = iterator.next();

      const run = (state: IteratorYieldResult<T> | IteratorReturnResult<A>): AIO<any, any, A> => {
        if (state.done) {
          return pure(state.value);
        }
        return chain_(state.value.T, (val) => {
          const next = iterator.next(val);
          return run(next);
        });
      };

      return run(state);
    });
  if (args.length === 0) {
    return (f: any) => _gen(f);
  }
  return _gen(args[0]);
}
