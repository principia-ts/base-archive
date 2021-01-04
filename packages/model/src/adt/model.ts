import type { ElemType, ExcludeUnion, ExtractUnion, KeysDefinition, Tagged } from './utils'

import * as A from '@principia/base/data/Array'
import * as Eq from '@principia/base/data/Eq'
import { tuple } from '@principia/base/data/Function'
import * as R from '@principia/base/data/Record'
import { getFirstSemigroup } from '@principia/base/Semigroup'

import * as Co from './constructors'
import * as Ma from './matcher'
import * as Op from './optics'
import * as Pr from './predicates'

export interface ADT<A, Tag extends keyof A & string>
  extends Ma.Matchers<A, Tag>,
    Pr.Predicates<A, Tag>,
    ConstructorsWithKeys<A, Tag>,
    Op.OpticsFor<A> {
  select: <Keys extends A[Tag][]>(keys: Keys) => ADT<ExtractUnion<A, Tag, ElemType<Keys>>, Tag>
  exclude: <Keys extends A[Tag][]>(keys: Keys) => ADT<ExcludeUnion<A, Tag, ElemType<Keys>>, Tag>
}

interface ConstructorsWithKeys<A, Tag extends keyof A & string> extends Co.Constructors<A, Tag> {
  keys: KeysDefinition<A, Tag>
}

export type ADTType<A extends ADT<any, any>> = Co.ConstructorType<A>

const mergeKeys = <A extends Tagged<Tag>, B extends Tagged<Tag>, Tag extends string>(
  a: KeysDefinition<A, Tag>,
  b: KeysDefinition<B, Tag>
): KeysDefinition<A | B, Tag> => ({ ...a, ...b } as any)

const recordFromArray = R.fromFoldable(getFirstSemigroup<any>(), A.Foldable)
const toTupleNull     = (k: string) => tuple(k, null)

const intersectKeys = <A extends Tagged<Tag>, B extends Tagged<Tag>, Tag extends string>(
  a: KeysDefinition<A, Tag>,
  b: KeysDefinition<B, Tag>
): KeysDefinition<Extract<A, B>, Tag> =>
  recordFromArray(A.intersection(Eq.string)(Object.keys(b))(Object.keys(a)).map(toTupleNull)) as KeysDefinition<
    Extract<A, B>,
    Tag
  >

const excludeKeys = <A extends Tagged<Tag>, Tag extends string>(
  a: KeysDefinition<A, Tag>,
  toRemove: Array<string>
): object => recordFromArray(A.difference(Eq.string)(toRemove)(Object.keys(a)).map(toTupleNull))

const keepKeys = <A extends Tagged<Tag>, Tag extends string>(
  a: KeysDefinition<A, Tag>,
  toKeep: Array<string>
): object => recordFromArray(A.intersection(Eq.string)(toKeep)(Object.keys(a)).map(toTupleNull))

export const unionADT = <
  AS extends [ConstructorsWithKeys<any, any>, ConstructorsWithKeys<any, any>, ...Array<ConstructorsWithKeys<any, any>>]
>(
    as: AS
  ): ADT<Co.ConstructorType<AS[number]>, AS[number]['tag']> => {
  const newKeys = A.foldRight(as[0].keys, (x: AS[number], y) => mergeKeys(x.keys, y))(as)
  return makeADT(as[0].tag)(newKeys)
}

export const intersectADT = <A extends Tagged<Tag>, B extends Tagged<Tag>, Tag extends string>(
  a: ADT<A, Tag>,
  b: ADT<B, Tag>
): ADT<Extract<A, B>, Tag> => makeADT(a.tag)(intersectKeys(a.keys, b.keys))

interface TypeDef<T> {
  _TD: T
}

type TypeOfDef<X extends TypeDef<any>> = X['_TD']

export const ofType = <T>(): TypeDef<T> => 1 as any

export const makeADT = <Tag extends string>(tag: Tag) => <R extends { [x in keyof R]: TypeDef<{ [t in Tag]: x }> }>(
  _keys: R
): ADT<TypeOfDef<R[keyof R]>, Tag> => {
  type Tag = typeof tag
  type A = TypeOfDef<R[keyof R]>
  type B = A & Tagged<Tag>
  const keys = _keys as KeysDefinition<Tagged<Tag>, Tag>

  const constructors = Co.Constructors(tag)(keys)
  const predicates = Pr.Predicates<A, Tag>(tag)(keys)
  const optics = Op.OpticsFor<A>()
  const matchers = Ma.Matchers<B, Tag>(tag)(keys)

  const select = <Keys extends A[Tag][]>(selectedKeys: Keys): ADT<ExtractUnion<A, Tag, ElemType<Keys>>, Tag> =>
    makeADT(tag)(keepKeys(keys, selectedKeys as string[]) as any)

  const exclude = <Keys extends B[Tag][]>(excludedKeys: Keys): ADT<ExcludeUnion<B, Tag, ElemType<Keys>>, Tag> =>
    makeADT(tag)(excludeKeys(keys, excludedKeys) as any)

  const res: ADT<B, Tag> = {
    ...constructors,
    ...predicates,
    ...optics,
    ...matchers,
    tag,
    keys,
    select,
    exclude
  }

  return res as ADT<A, Tag>
}
