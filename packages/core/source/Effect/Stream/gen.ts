import type { Either } from "../../Either";
import { NoSuchElementException, PrematureGeneratorExit } from "../../GlobalExceptions";
import type { Option } from "../../Option";
import type { Effect } from "../Effect";
import { askService, die, fromEither } from "../Effect";
import type { Has, Tag } from "../Has";
import type { _E, _R } from "../Support/utils";
import { isEither, isOption, isTag } from "../Support/utils";
import { fromEffect, suspend } from "./constructors";
import { chain_, pure } from "./methods";
import { Stream } from "./Stream";

export class GenStream<R, E, A> {
   readonly _R!: (_R: R) => void;
   readonly _E!: () => E;
   readonly _A!: () => A;
   constructor(readonly S: Stream<R, E, A>) {}
   *[Symbol.iterator](): Generator<GenStream<R, E, A>, A, any> {
      return yield this;
   }
}

const adapter = (_: any, __?: any) => {
   if (isOption(_)) {
      return new GenStream(
         _._tag === "None" ? fail(__ ? __() : new NoSuchElementException("Stream.gen")) : pure(_.value)
      );
   } else if (isEither(_)) {
      return new GenStream(fromEffect(fromEither(() => _)));
   } else if (_ instanceof Stream) {
      return new GenStream(_);
   } else if (isTag(_)) {
      return new GenStream(fromEffect(askService(_)));
   }
   return new GenStream(fromEffect(_));
};

export const gen = <T extends GenStream<any, any, any>, A>(
   f: (i: {
      <A>(_: Tag<A>): GenStream<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenStream<unknown, E, A>;
      <A>(_: Option<A>): GenStream<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenStream<unknown, E, A>;
      <R, E, A>(_: Effect<R, E, A>): GenStream<R, E, A>;
      <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>;
   }) => Generator<T, A, any>
): Stream<_R<T>, _E<T>, A> =>
   suspend(() => {
      function run(replayStack: any[]): Stream<any, any, A> {
         const iterator = f(adapter as any);
         let state = iterator.next();
         for (let i = 0; i < replayStack.length; i++) {
            if (state.done) {
               return fromEffect(die(new PrematureGeneratorExit("Stream.gen")));
            }
            state = iterator.next(replayStack[i]);
         }
         if (state.done) {
            return pure(state.value);
         }
         return chain_(state.value["S"], (val) => {
            return run(replayStack.concat([val]));
         });
      }
      return run([]);
   });
