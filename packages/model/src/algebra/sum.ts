import type { AnyEnv, Config, ErrorOf, InterpretedKind, InterpreterURIS, Param } from '../HKT'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'
import type * as DE from '@principia/codec/DecodeError'

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
  readonly taggedUnion: <Tag extends string, Members extends TaggedTypes<F, Env, Tag, any, any, any, any>>(
    tag: Tag,
    members: Members & { [K in keyof Members]: DecorateTag<Members[K], Tag, K> },
    config?: Config<
      Env,
      Infer<F, Env, 'I', Members[keyof Members]>,
      | DE.UnknownRecordLE
      | DE.TagNotFoundE<Tag, DE.LiteralE<keyof Members>>
      | DE.SumE<{ readonly [K in keyof Members]: DE.MemberE<K, ErrorOf<F, Env, Members[K]>> }[keyof Members]>,
      Infer<F, Env, 'A', Members[keyof Members]>,
      Infer<F, Env, 'O', Members[keyof Members]>,
      TaggedUnionConfig<Members>
    >
  ) => InterpretedKind<
    F,
    Env,
    Infer<F, Env, 'I', Members[keyof Members]>,
    | DE.UnknownRecordLE
    | DE.TagNotFoundE<Tag, DE.LiteralE<keyof Members>>
    | DE.SumE<{ readonly [K in keyof Members]: DE.MemberE<K, ErrorOf<F, Env, Members[K]>> }[keyof Members]>,
    Infer<F, Env, 'A', Members[keyof Members]>,
    Infer<F, Env, 'O', Members[keyof Members]>
  >
  readonly either: <EE, EA, EO, AE, AA, AO>(
    left: InterpretedKind<F, Env, unknown, EE, EA, EO>,
    right: InterpretedKind<F, Env, unknown, AE, AA, AO>,
    config?: Config<
      Env,
      unknown,
      | DE.UnknownRecordLE
      | DE.TagNotFoundE<'_tag', DE.LiteralE<'Left' | 'Right'>>
      | DE.SumE<
          | DE.MemberE<
              'Left',
              | DE.LeafE<DE.UnknownRecordE>
              | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'Left'>>> | DE.KeyE<'left', EE>>
            >
          | DE.MemberE<
              'Right',
              | DE.LeafE<DE.UnknownRecordE>
              | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'Right'>>> | DE.KeyE<'right', AE>>
            >
        >,
      Either<EA, AA>,
      Either<EO, AO>,
      EitherConfig<unknown, EE, EA, EO, unknown, AE, AA, AO>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    | DE.UnknownRecordLE
    | DE.TagNotFoundE<'_tag', DE.LiteralE<'Left' | 'Right'>>
    | DE.SumE<
        | DE.MemberE<
            'Left',
            | DE.LeafE<DE.UnknownRecordE>
            | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'Left'>>> | DE.KeyE<'left', EE>>
          >
        | DE.MemberE<
            'Right',
            | DE.LeafE<DE.UnknownRecordE>
            | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'Right'>>> | DE.KeyE<'right', AE>>
          >
      >,
    Either<EA, AA>,
    Either<EO, AO>
  >
  readonly option: <E, A, O>(
    a: InterpretedKind<F, Env, unknown, E, A, O>,
    config?: Config<
      Env,
      unknown,
      | DE.UnknownRecordLE
      | DE.TagNotFoundE<'_tag', DE.LiteralE<'None' | 'Some'>>
      | DE.SumE<
          | DE.MemberE<'None', DE.LeafE<DE.UnknownRecordE> | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'None'>>>>>
          | DE.MemberE<
              'Some',
              | DE.LeafE<DE.UnknownRecordE>
              | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'Some'>>> | DE.KeyE<'value', E>>
            >
        >,
      Option<A>,
      Option<O>,
      OptionConfig<unknown, E, A, O>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    | DE.UnknownRecordLE
    | DE.TagNotFoundE<'_tag', DE.LiteralE<'None' | 'Some'>>
    | DE.SumE<
        | DE.MemberE<'None', DE.LeafE<DE.UnknownRecordE> | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'None'>>>>>
        | DE.MemberE<
            'Some',
            | DE.LeafE<DE.UnknownRecordE>
            | DE.StructE<DE.KeyE<'_tag', DE.LeafE<DE.LiteralE<'Some'>>> | DE.KeyE<'value', E>>
          >
      >,
    Option<A>,
    Option<O>
  >
}
