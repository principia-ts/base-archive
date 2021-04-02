import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Primitive } from '@principia/base/util/types'

export interface URItoDecodeError<E> {
  StringE: StringE
  NumberE: NumberE
  BooleanE: BooleanE
  UnknownArrayE: UnknownArrayE
  UnknownRecordE: UnknownRecordE
  LiteralE: LiteralE<readonly [Primitive, ...ReadonlyArray<Primitive>]>
  NullableE: NullableRE<E>
  KeyE: KeyE<E>
  StructE: StructRE<E>
  PartialE: PartialRE<E>
  IndexE: IndexE<E>
  TupleE: TupleRE<E>
  ArrayE: ArrayRE<E>
  RecordE: RecordRE<E>
  UnionE: UnionRE<E>
  RefineE: RefineRE<E>
  ParseE: ParseRE<E>
  IntersectionE: IntersectionRE<E>
  LazyE: LazyRE<E>
  TagE: TagE<any>
  SumE: SumE<E>
}

export type DecodeError<E> = E | URItoDecodeError<E>[keyof URItoDecodeError<any>]

export class StringE {
  readonly _tag = 'StringE'
  constructor(readonly actual: unknown) {}
}

export interface NumberE {
  readonly _tag: 'NumberE'
  readonly actual: unknown
}

export interface BooleanE {
  readonly _tag: 'BooleanE'
  readonly actual: unknown
}

export interface UnknownArrayE {
  readonly _tag: 'UnknownArrayE'
  readonly actual: unknown
}

export interface UnknownRecordE {
  readonly _tag: 'UnknownRecordE'
  readonly actual: unknown
}

export interface LiteralE<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]> {
  readonly _tag: 'LiteralE'
  readonly actual: unknown
  readonly literals: A
}

export interface NullableE<E> {
  readonly _tag: 'NullableE'
  readonly actual: unknown
  readonly error: E
}

export interface KeyE<E> {
  readonly actual: unknown
  readonly key: string
  readonly error: E
}

export interface StructE<E> {
  readonly _tag: 'StructE'
  readonly actual: unknown
  readonly error: NonEmptyArray<KeyE<E>>
}

export interface PartialE<E> {
  readonly _tag: 'PartialE'
  readonly actual: unknown
  readonly error: NonEmptyArray<KeyE<E>>
}

export interface IndexE<E> {
  readonly actual: unknown
  readonly index: number
  readonly error: E
}

export interface TupleE<E> {
  readonly _tag: 'TupleE'
  readonly actual: unknown
  readonly error: NonEmptyArray<IndexE<E>>
}

export interface ArrayE<E> {
  readonly _tag: 'ArrayE'
  readonly actual: unknown
  readonly error: NonEmptyArray<IndexE<E>>
}

export interface RecordE<E> {
  readonly _tag: 'RecordE'
  readonly actual: unknown
  readonly error: NonEmptyArray<KeyE<E>>
}

export interface UnionE<E> {
  readonly _tag: 'UnionE'
  readonly actual: unknown
  readonly error: NonEmptyArray<IndexE<E>>
}

export class RefineE<E> {
  readonly _tag = 'RefineE'
  constructor(readonly actual: unknown, readonly error: E) {}
}

export class ParseE<E> {
  readonly _tag = 'ParseE'
  constructor(readonly actual: unknown, readonly error: E) {}
}

export interface IntersectionE<E> {
  readonly _tag: 'IntersectionE'
  readonly actual: unknown
  readonly error: NonEmptyArray<IndexE<E>>
}

export interface LazyE<E> {
  readonly _tag: 'LazyE'
  readonly id: string
  readonly error: E
}

export interface TagE<A> {
  readonly _tag: 'TagE'
  readonly actual: unknown
  readonly literals: NonEmptyArray<A>
}

export interface SumE<E> {
  readonly _tag: 'SumE'
  readonly actual: unknown
  readonly error: NonEmptyArray<IndexE<E>>
}

export interface NullableRE<E> extends NullableE<DecodeError<E>> {}
export interface RefineRE<E> extends RefineE<DecodeError<E>> {}
export interface ParseRE<E> extends ParseE<DecodeError<E>> {}
export interface StructRE<E> extends StructE<DecodeError<E>> {}
export interface PartialRE<E> extends PartialE<DecodeError<E>> {}
export interface TupleRE<E> extends TupleE<DecodeError<E>> {}
export interface ArrayRE<E> extends ArrayE<DecodeError<E>> {}
export interface RecordRE<E> extends RecordE<DecodeError<E>> {}
export interface UnionRE<E> extends UnionE<DecodeError<E>> {}
export interface IntersectionRE<E> extends IntersectionE<DecodeError<E>> {}
export interface LazyRE<E> extends LazyE<DecodeError<E>> {}

