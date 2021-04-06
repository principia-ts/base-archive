import type { AnyEnv, Config, InterpretedKind, InterpreterURIS, Param } from '../HKT'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'
import type { LiteralE, StringE, TagE, UnknownRecordE } from '@principia/codec/DecodeError'

export const SumURI = 'model/algebra/sum'

export type SumURI = typeof SumURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [SumURI]: SumAlgebra<IURI, Env>
  }
}

export type TaggedValues<Tag extends string, O> = {
  [o in keyof O]: O[o] & { [t in Tag]: o }
}

export type TaggedTypes<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  Tag extends string,
  I,
  E,
  A,
  O
> = unknown extends I
  ? {
      [o in keyof A & keyof O]: InterpretedKind<F, Env, unknown, E, (A & { [x in o]: { [k in Tag]: o } })[o], O[o]>
    }
  : {
      [o in keyof A & keyof O & keyof I]: InterpretedKind<
        F,
        Env,
        I[o],
        E,
        (A & { [x in o]: { [k in Tag]: o } })[o],
        O[o]
      >
    }

type Infer<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  P extends Param,
  T extends InterpretedKind<F, Env, any, any, any, any>
> = T extends InterpretedKind<F, Env, infer I, infer E, infer A, infer O>
  ? 'I' extends P
    ? I
    : 'E' extends P
    ? E
    : 'A' extends P
    ? A
    : 'O' extends P
    ? O
    : never
  : never

type DecorateTag<
  X extends InterpretedKind<any, any, any, any, any, any>,
  Tag extends string,
  VTag
> = X extends InterpretedKind<infer F, infer Env, infer I, infer E, infer A, infer O>
  ? InterpretedKind<F, Env, I, E, A & { [k in Tag]: VTag }, O>
  : never

export interface TaggedUnionConfig<Types> {}
export interface EitherConfig<EI, EE, EA, EO, AI, AE, AA, AO> {}
export interface OptionConfig<I, E, A, O> {}

export interface SumAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly taggedUnion: <Tag extends string, Types extends TaggedTypes<F, Env, Tag, any, any, any, any>>(
    tag: Tag,
    types: Types & { [K in keyof Types]: DecorateTag<Types[K], Tag, K> },
    config?: Config<
      Env,
      Infer<F, Env, 'I', Types[keyof Types]>,
      Infer<F, Env, 'E', Types[keyof Types]>,
      Infer<F, Env, 'A', Types[keyof Types]>,
      Infer<F, Env, 'O', Types[keyof Types]>,
      TaggedUnionConfig<Types>
    >
  ) => InterpretedKind<
    F,
    Env,
    Infer<F, Env, 'I', Types[keyof Types]>,
    Infer<F, Env, 'E', Types[keyof Types]>,
    Infer<F, Env, 'A', Types[keyof Types]>,
    Infer<F, Env, 'O', Types[keyof Types]>
  >
  readonly either: <EE, EA, EO, AE, AA, AO>(
    left: InterpretedKind<F, Env, unknown, EE, EA, EO>,
    right: InterpretedKind<F, Env, unknown, AE, AA, AO>,
    config?: Config<
      Env,
      unknown,
      EE | AE | StringE | UnknownRecordE | TagE<'Left' | 'Right'> | LiteralE<['Left']> | LiteralE<['Right']>,
      Either<EA, AA>,
      Either<EO, AO>,
      EitherConfig<unknown, EE, EA, EO, unknown, AE, AA, AO>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    EE | AE | StringE | UnknownRecordE | TagE<'Left' | 'Right'> | LiteralE<['Left']> | LiteralE<['Right']>,
    Either<EA, AA>,
    Either<EO, AO>
  >
  readonly option: <E, A, O>(
    a: InterpretedKind<F, Env, unknown, E, A, O>,
    config?: Config<
      Env,
      unknown,
      E | StringE | UnknownRecordE | TagE<'None' | 'Some'> | LiteralE<['Some']> | LiteralE<['None']>,
      Option<A>,
      Option<O>,
      OptionConfig<unknown, E, A, O>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    E | StringE | UnknownRecordE | TagE<'None' | 'Some'> | LiteralE<['Some']> | LiteralE<['None']>,
    Option<A>,
    Option<O>
  >
}
