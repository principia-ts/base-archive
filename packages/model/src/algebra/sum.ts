import type { Either } from "@principia/core/Either";
import type { Option } from "@principia/core/Option";

import type { AnyEnv, Config, InterpretedKind, InterpreterURIS, Param } from "../HKT";

export const SumURI = "model/algebra/sum";

export type SumURI = typeof SumURI;

declare module "../HKT" {
  interface URItoAlgebra<IURI, Env> {
    readonly [SumURI]: SumAlgebra<IURI, Env>;
  }
}

export type TaggedValues<Tag extends string, O> = {
  [o in keyof O]: O[o] & { [t in Tag]: o };
};

export type TaggedTypes<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  Tag extends string,
  S,
  R,
  E,
  A
> = {
  [o in keyof A & keyof E]: InterpretedKind<
    F,
    Env,
    unknown,
    unknown,
    E[o],
    (A & { [x in o]: { [k in Tag]: o } })[o]
  >;
};

type Infer<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  P extends Param,
  T extends InterpretedKind<F, Env, any, any, any, any>
> = T extends InterpretedKind<F, Env, infer S, infer R, infer E, infer A>
  ? "S" extends P
    ? S
    : "R" extends P
    ? R
    : "E" extends P
    ? E
    : "A" extends P
    ? A
    : never
  : never;

type DecorateTag<
  X extends InterpretedKind<any, any, any, any, any, any>,
  Tag extends string,
  VTag
> = X extends InterpretedKind<infer F, infer Env, infer S, infer R, infer E, infer A>
  ? InterpretedKind<F, Env, S, R, E, A & { [k in Tag]: VTag }>
  : never;

export interface TaggedUnionConfig<Types> {}
export interface EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA> {}
export interface OptionConfig<S, R, E, A> {}

export interface SumAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly taggedUnion: <
    Tag extends string,
    Types extends TaggedTypes<F, Env, Tag, any, any, any, any>
  >(
    tag: Tag,
    types: Types & { [K in keyof Types]: DecorateTag<Types[K], Tag, K> },
    config?: Config<
      Env,
      Infer<F, Env, "S", Types[keyof Types]>,
      Infer<F, Env, "R", Types[keyof Types]>,
      Infer<F, Env, "E", Types[keyof Types]>,
      Infer<F, Env, "A", Types[keyof Types]>,
      TaggedUnionConfig<Types>
    >
  ) => InterpretedKind<
    F,
    Env,
    Infer<F, Env, "S", Types[keyof Types]>,
    Infer<F, Env, "R", Types[keyof Types]>,
    Infer<F, Env, "E", Types[keyof Types]>,
    Infer<F, Env, "A", Types[keyof Types]>
  >;
  readonly either: <ES, ER, EE, EA, AS, AR, AE, AA>(
    left: InterpretedKind<F, Env, ES, ER, EE, EA>,
    right: InterpretedKind<F, Env, AS, AR, AE, AA>,
    config?: Config<
      Env,
      Either<ES, AS>,
      Either<ER, AR>,
      Either<EE, AE>,
      Either<EA, AA>,
      EitherConfig<ES, ER, EE, EA, AS, AR, AE, AA>
    >
  ) => InterpretedKind<F, Env, Either<ES, AS>, Either<ER, AR>, Either<EE, AE>, Either<EA, AA>>;
  readonly option: <S, R, E, A>(
    a: InterpretedKind<F, Env, S, R, E, A>,
    config?: Config<Env, Option<S>, Option<R>, Option<E>, Option<A>, OptionConfig<S, R, E, A>>
  ) => InterpretedKind<F, Env, Option<S>, Option<R>, Option<E>, Option<A>>;
}
