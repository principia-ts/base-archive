import * as DSL from "../DSL";
import type * as O from "../Option";
import { isOption } from "../Utils/guards";
import { Monad } from "./monad";

const adapter: {
   <A>(_: O.Option<A>): DSL.GenHKT<ReadonlyArray<A>, A>;
   <A>(_: ReadonlyArray<A>): DSL.GenHKT<ReadonlyArray<A>, A>;
} = (_: any) => {
   if (isOption(_)) {
      return new DSL.GenHKT(_._tag === "None" ? [] : [_.value]);
   }
   return new DSL.GenHKT(_);
};

export const gen = DSL.genWithHistoryF(Monad, { adapter });
