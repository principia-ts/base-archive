import type { Model } from '../abstract/Model'
import type { SumURI, TaggedUnionConfig } from '../algebra'
import type { Algebra, Config, InterpretedHKT, InterpreterURIS, ProgramURIS, ResultURIS, URItoProgram } from '../HKT'
import type { _A, _E, _I, _O, InhabitedTypes } from '../utils'
import type { ADT } from './model'
import type { ElemType } from './utils'

import * as A from '@principia/base/Array'
import * as R from '@principia/base/Record'
import * as Se from '@principia/base/Semigroup'
import * as S from '@principia/base/string'
import { tuple } from '@principia/base/tuple'

import { assignCallable, wrapFun } from '../utils'
import { makeADT } from './model'

export type TaggedUnionProgram<PURI extends ProgramURIS, Env, I, E, A, O> = URItoProgram<Env, I, E, A, O>[PURI] &
  (<G extends InterpreterURIS>(a: Algebra<SumURI, G, Env>) => InterpretedHKT<G, Env, I, E, A, O>)

type AnyTypes = Record<string, InhabitedTypes<any, any, any, any, any>>

const recordFromArray = R.fromFoldable(Se.first<any>(), A.Foldable)
const keepKeys        = (a: Record<string, any>, toKeep: Array<string>): object =>
  recordFromArray(A.intersection(S.Eq)(toKeep)(Object.keys(a)).map((k: string) => tuple(k, a[k])))

const excludeKeys = (a: Record<string, any>, toExclude: Array<string>): object =>
  recordFromArray(A.difference(S.Eq)(toExclude)(Object.keys(a)).map((k: string) => tuple(k, a[k])))

type AnyADTTypes = {
  [k in keyof AnyTypes]: [any, any, any, any]
}

interface HasTypes<Types extends AnyADTTypes> {
  _Types: Types
}

type AnyMorph<PURI extends ProgramURIS, RURI extends ResultURIS, Env> = Model<PURI, RURI, Env, any, any, any, any>

export type UnionTypes<
  PURI extends ProgramURIS,
  RURI extends ResultURIS,
  Env,
  Types extends AnyTypes,
  Tag extends keyof any
> = {
  [k in keyof Types]: Model<PURI, RURI, Env, _I<Types[k]>, _E<Types[k]>, _A<Types[k]> & { [t in Tag]: k }, _O<Types[k]>>
}

export type IOfTypes<Types extends AnyADTTypes> = Types[keyof Types][0]

export type EOfTypes<Types extends AnyADTTypes> = Types[keyof Types][1]

export type AOfTypes<Types extends AnyADTTypes> = Types[keyof Types][2]

export type OOfTypes<Types extends AnyADTTypes> = Types[keyof Types][3]

export type MorphADT<
  PURI extends ProgramURIS,
  RURI extends ResultURIS,
  Env,
  Types extends AnyADTTypes,
  Tag extends string
> = HasTypes<Types> &
  ADT<AOfTypes<Types>, Tag> &
  Model<PURI, RURI, Env, IOfTypes<Types>, EOfTypes<Types>, AOfTypes<Types>, OOfTypes<Types>> &
  Refinable<PURI, RURI, Env, Types, Tag>

export interface Refinable<
  PURI extends ProgramURIS,
  RURI extends ResultURIS,
  Env,
  Types extends AnyADTTypes,
  Tag extends string
> {
  selectMorph: <Keys extends (keyof Types)[]>(
    keys: Keys,
    config?: {
      name?: string
      config?: Config<
        Env,
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][0]
        }[Extract<keyof Types, ElemType<Keys>>],
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][1]
        }[Extract<keyof Types, ElemType<Keys>>],
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][2]
        }[Extract<keyof Types, ElemType<Keys>>],
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][3]
        }[Extract<keyof Types, ElemType<Keys>>],
        TaggedUnionConfig<
          {
            [k in Extract<keyof Types, ElemType<Keys>>]: Types[k]
          }
        >
      >
    }
  ) => MorphADT<
    PURI,
    RURI,
    Env,
    {
      [k in Extract<keyof Types, ElemType<Keys>>]: Types[k]
    },
    Tag
  >
  excludeMorph: <Keys extends (keyof Types)[]>(
    keys: Keys,
    config?: {
      name?: string
      config?: Config<
        Env,
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][0]
        }[Exclude<keyof Types, ElemType<Keys>>],
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][1]
        }[Exclude<keyof Types, ElemType<Keys>>],
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][2]
        }[Exclude<keyof Types, ElemType<Keys>>],
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][3]
        }[Exclude<keyof Types, ElemType<Keys>>],
        TaggedUnionConfig<
          {
            [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k]
          }
        >
      >
    }
  ) => MorphADT<
    PURI,
    RURI,
    Env,
    {
      [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k]
    },
    Tag
  >
}

export type TaggedBuilder<PURI extends ProgramURIS, RURI extends ResultURIS, Env> = <Tag extends string>(
  tag: Tag
) => <Types extends UnionTypes<PURI, RURI, Env, Types, Tag>>(
  o: Types,
  config?: {
    name?: string
    config?: Config<
      Env,
      Types[keyof Types]['_I'],
      Types[keyof Types]['_E'],
      Types[keyof Types]['_A'],
      Types[keyof Types]['_O'],
      TaggedUnionConfig<Types>
    >
  }
) => MorphADT<
  PURI,
  RURI,
  Env,
  {
    [k in keyof Types]: Types[k] extends InhabitedTypes<any, infer I, infer E, infer A, infer O> ? [I, E, A, O] : never
  },
  Tag
>

export function makeTagged<PURI extends ProgramURIS, RURI extends ResultURIS, Env>(
  summ: <I, E, A, O>(F: TaggedUnionProgram<PURI, Env, I, E, A, O>) => Model<PURI, RURI, Env, I, E, A, O>
): TaggedBuilder<PURI, RURI, Env>
export function makeTagged<PURI extends ProgramURIS, RURI extends ResultURIS, Env>(
  summ: <I, E, A, O>(F: TaggedUnionProgram<PURI, Env, I, E, A, O>) => Model<PURI, RURI, Env, I, E, A, O>
): <Tag extends string>(
  tag: Tag
) => <Types extends UnionTypes<PURI, RURI, Env, Types, Tag>>(
  o: Types,
  config?: {
    name?: string
    config?: Config<
      Parameters<Types[keyof Types]['_Env']>[0],
      Types[keyof Types]['_I'],
      Types[keyof Types]['_E'],
      Types[keyof Types]['_A'],
      Types[keyof Types]['_O'],
      TaggedUnionConfig<Types>
    >
  }
) => MorphADT<
  PURI,
  RURI,
  Env,
  {
    [k in keyof Types]: Types[k] extends InhabitedTypes<any, infer I, infer E, infer A, infer O> ? [I, E, A, O] : never
  },
  Tag
> {
  return (tag) => (o, config) => {
    const summoned = summ((F: any) =>
      F.taggedUnion(tag, R.imap((_k, v: AnyMorph<PURI, RURI, Env>) => (v as any)(F))(o), config)
    ) as any

    const adt = makeADT(tag)(o as any)

    const preTagged = makeTagged(summ)(tag)

    const selectMorph  = (selectedKeys: string[], c?: { name?: string, config?: any }) =>
      preTagged(keepKeys(o, selectedKeys as string[]), {
        name: c?.name || config?.name,
        config: { ...config?.config, ...c?.config }
      })
    const excludeMorph = (selectedKeys: string[], c?: { name?: string, config?: any }) =>
      preTagged(excludeKeys(o, selectedKeys as string[]), {
        name: c?.name || config?.name,
        config: { ...config?.config, ...c?.config }
      })

    const res = assignCallable(wrapFun(summoned as any), {
      ...summoned,
      ...adt,
      selectMorph,
      excludeMorph
    })

    return res
  }
}
