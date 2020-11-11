import type { Either } from "../../Either";
import { NoSuchElementException, PrematureGeneratorExit } from "../../GlobalExceptions";
import type { Has, Tag } from "../../Has";
import type { Option } from "../../Option";
import { isEither, isOption, isTag } from "../../Utils/guards";
import type { _E, _R } from "../../Utils/infer";
import type { Task } from "../Task";
import { askService, die, fromEither } from "../Task";
import { fromTask, succeed, suspend } from "./constructors";
import { Stream } from "./model";
import { chain_ } from "./monad";

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
         _._tag === "None" ? fail(__ ? __() : new NoSuchElementException("Stream.gen")) : succeed(_.value)
      );
   } else if (isEither(_)) {
      return new GenStream(fromTask(fromEither(() => _)));
   } else if (_ instanceof Stream) {
      return new GenStream(_);
   } else if (isTag(_)) {
      return new GenStream(fromTask(askService(_)));
   }
   return new GenStream(fromTask(_));
};

export const gen = <T extends GenStream<any, any, any>, A>(
   f: (i: {
      <A>(_: Tag<A>): GenStream<Has<A>, never, A>;
      <E, A>(_: Option<A>, onNone: () => E): GenStream<unknown, E, A>;
      <A>(_: Option<A>): GenStream<unknown, NoSuchElementException, A>;
      <E, A>(_: Either<E, A>): GenStream<unknown, E, A>;
      <R, E, A>(_: Task<R, E, A>): GenStream<R, E, A>;
      <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>;
   }) => Generator<T, A, any>
): Stream<_R<T>, _E<T>, A> =>
   suspend(() => {
      function run(replayStack: any[]): Stream<any, any, A> {
         const iterator = f(adapter as any);
         let state = iterator.next();
         for (let i = 0; i < replayStack.length; i++) {
            if (state.done) {
               return fromTask(die(new PrematureGeneratorExit("Stream.gen")));
            }
            state = iterator.next(replayStack[i]);
         }
         if (state.done) {
            return succeed(state.value);
         }
         return chain_(state.value.S, (val) => {
            return run(replayStack.concat([val]));
         });
      }
      return run([]);
   });
