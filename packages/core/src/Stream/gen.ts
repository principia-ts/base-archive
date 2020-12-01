import type { Either } from "../Either";
import { NoSuchElementException, PrematureGeneratorExit } from "../GlobalExceptions";
import type { Has, Tag } from "../Has";
import type { IO } from "../IO";
import { askService, die, fromEither } from "../IO";
import * as L from "../List/_core";
import type { Option } from "../Option";
import { isEither, isOption, isTag } from "../Utils/guards";
import type { _E, _R } from "../Utils/infer";
import { fromEffect, succeed, suspend } from "./constructors";
import { Stream } from "./model";
import { chain_ } from "./monad";

export class GenStream<R, E, A> {
  readonly _R!: (_R: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;
  constructor(readonly S: () => Stream<R, E, A>) {}
  *[Symbol.iterator](): Generator<GenStream<R, E, A>, A, any> {
    return yield this;
  }
}

const adapter = (_: any, __?: any) => {
  return new GenStream(() => {
    const x = _();
    if (isOption(x)) {
      return x._tag === "None"
        ? fail(__ ? __() : new NoSuchElementException("Stream.gen"))
        : succeed(x.value);
    } else if (isEither(x)) {
      return fromEffect(fromEither(() => x));
    } else if (x instanceof Stream) {
      return x;
    } else if (isTag(x)) {
      return fromEffect(askService(x));
    }
    return fromEffect(x);
  });
};
export function gen<R0, E0, A0>(): <T extends GenStream<R0, E0, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>;
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>;
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>;
    <E, A>(_: () => Either<E, A>): GenStream<unknown, E, A>;
    <R, E, A>(_: () => IO<R, E, A>): GenStream<R, E, A>;
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>;
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>;
export function gen<E0, A0>(): <T extends GenStream<any, E0, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>;
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>;
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>;
    <E, A>(_: () => Either<E, A>): GenStream<unknown, E, A>;
    <R, E, A>(_: () => IO<R, E, A>): GenStream<R, E, A>;
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>;
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>;
export function gen<A0>(): <T extends GenStream<any, any, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>;
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>;
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>;
    <E, A>(_: () => Either<E, A>): GenStream<unknown, E, A>;
    <R, E, A>(_: () => IO<R, E, A>): GenStream<R, E, A>;
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>;
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>;
export function gen<T extends GenStream<any, any, any>, A0>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>;
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>;
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>;
    <E, A>(_: () => Either<E, A>): GenStream<unknown, E, A>;
    <R, E, A>(_: () => IO<R, E, A>): GenStream<R, E, A>;
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>;
  }) => Generator<T, A0, any>
): Stream<_R<T>, _E<T>, A0>;
export function gen(...args: any[]): any {
  function gen_<T extends GenStream<any, any, any>, A>(
    f: (i: any) => Generator<T, A, any>
  ): Stream<_R<T>, _E<T>, A> {
    return suspend(() => {
      function run(replayStack: L.List<any>): Stream<any, any, A> {
        const iterator = f(adapter as any);
        let state = iterator.next();
        let prematureExit = false;
        L.forEach_(replayStack, (a) => {
          if (state.done) {
            prematureExit = true;
          }
          state = iterator.next(a);
        });
        if (prematureExit) {
          return fromEffect(die(new PrematureGeneratorExit("Stream.gen")));
        }
        if (state.done) {
          return succeed(state.value);
        }
        return chain_(state.value.S(), (val) => {
          return run(L.append_(replayStack, val));
        });
      }
      return run(L.empty());
    });
  }
  if (args.length === 0) {
    return (f: any) => gen_(f);
  }
  return gen_(args[0]);
}
