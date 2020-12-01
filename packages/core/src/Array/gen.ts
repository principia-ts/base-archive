import * as DSL from "../DSL";
import type * as O from "../Option";
import { isOption } from "../Utils/guards";
import { Monad } from "./monad";

const adapter: {
  <A>(_: () => O.Option<A>): DSL.GenLazyHKT<ReadonlyArray<A>, A>;
  <A>(_: () => ReadonlyArray<A>): DSL.GenLazyHKT<ReadonlyArray<A>, A>;
} = (_: () => any) =>
  new DSL.GenLazyHKT(() => {
    const x = _();
    if (isOption(x)) {
      return new DSL.GenHKT(x._tag === "None" ? [] : [x.value]);
    }
    return x;
  });

export const gen = DSL.genWithHistoryF(Monad, { adapter });
