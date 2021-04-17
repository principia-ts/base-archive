import type { Eval } from '@principia/base/Eval'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { RoseTree } from '@principia/base/RoseTree'
import type { Primitive } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as Ev from '@principia/base/Eval'
import { flow, pipe } from '@principia/base/function'
import * as NA from '@principia/base/NonEmptyArray'
import * as RT from '@principia/base/RoseTree'
import * as Str from '@principia/base/string'
import * as Th from '@principia/base/These'

/*
 * -------------------------------------------
 * error model
 * -------------------------------------------
 */

export type DecodeError<E> =
  | UnexpectedIndicesE
  | UnexpectedKeysE
  | MissingIndicesE
  | MissingKeysE
  | LeafE<E>
  | RequiredKeyE<string, DecodeError<E>>
  | OptionalKeyE<string, DecodeError<E>>
  | OptionalIndexE<number, DecodeError<E>>
  | RequiredIndexE<number, DecodeError<E>>
  | MemberE<string | number, DecodeError<E>>
  | RefinementE<DecodeError<E>>
  | ParserE<DecodeError<E>>
  | NullableE<DecodeError<E>>
  | OptionalE<DecodeError<E>>
  | StructE<DecodeError<E>>
  | PartialE<DecodeError<E>>
  | TupleE<DecodeError<E>>
  | ArrayE<DecodeError<E>>
  | RecordE<DecodeError<E>>
  | UnionE<DecodeError<E>>
  | IntersectionE<DecodeError<E>>
  | LazyE<DecodeError<E>>
  | SumE<DecodeError<E>>
  | CompositionE<DecodeError<E>>
  | LabeledE<DecodeError<E>>
  | MessageE<DecodeError<E>>
  | TagNotFoundE<string, DecodeError<E>>

export type BuiltinE =
  | StringE
  | NumberE
  | BooleanE
  | BigIntE
  | UnknownArrayE
  | UnknownRecordE
  | LiteralE<Primitive>
  | NaNE
  | InfinityE
  | EmptyE

export interface ActualE<I> {
  readonly actual: I
}

export interface SingleE<E> {
  readonly error: E
}

export interface CompoundE<E> {
  readonly errors: NonEmptyArray<E>
}

export interface LeafE<E> extends SingleE<E> {
  readonly _tag: 'LeafE'
}

export function leafE<E>(error: E): LeafE<E> {
  return { _tag: 'LeafE', error }
}

export interface StringE extends ActualE<unknown> {
  readonly _tag: 'StringE'
}
export interface StringLE extends LeafE<StringE> {}

export function stringE(actual: unknown): StringE {
  return { _tag: 'StringE', actual }
}

export interface NumberE extends ActualE<unknown> {
  readonly _tag: 'NumberE'
}
export interface NumberLE extends LeafE<NumberE> {}

export function numberE(actual: unknown): NumberE {
  return { _tag: 'NumberE', actual }
}

export interface NaNE {
  _tag: 'NaNE'
}
export interface NaNLE extends LeafE<NaNE> {}

export const nanE: NaNE = { _tag: 'NaNE' }

export interface InfinityE {
  _tag: 'InfinityE'
}
export interface InfinityLE extends LeafE<InfinityE> {}

export const infinityE: InfinityE = { _tag: 'InfinityE' }

export interface BooleanE extends ActualE<unknown> {
  readonly _tag: 'BooleanE'
}
export interface BooleanLE extends LeafE<BooleanE> {}

export function booleanE(actual: unknown): BooleanE {
  return { _tag: 'BooleanE', actual }
}

export interface UnknownArrayE extends ActualE<unknown> {
  readonly _tag: 'UnknownArrayE'
}
export interface UnknownArrayLE extends LeafE<UnknownArrayE> {}

export function unknownArrayE(actual: unknown): UnknownArrayE {
  return { _tag: 'UnknownArrayE', actual }
}

export interface EmptyE {
  readonly _tag: 'EmptyE'
}
export interface EmptyLE extends LeafE<EmptyE> {}

export const emptyE: EmptyE = { _tag: 'EmptyE' }

export interface UnknownRecordE extends ActualE<unknown> {
  readonly _tag: 'UnknownRecordE'
}
export interface UnknownRecordLE extends LeafE<UnknownRecordE> {}

export function unknownRecordE(actual: unknown): UnknownRecordE {
  return { _tag: 'UnknownRecordE', actual }
}

export interface BigIntE extends ActualE<unknown> {
  readonly _tag: 'BigIntE'
}
export interface BigIntLE extends LeafE<BigIntE> {}

export function bigIntE(actual: unknown): BigIntE {
  return { _tag: 'BigIntE', actual }
}

export interface DateFromStringE extends ActualE<string> {
  readonly _tag: 'DateFromStringE'
}
export interface DateFromStringLE extends LeafE<DateFromStringE> {}

export function dateFromStringE(actual: string): DateFromStringE {
  return { _tag: 'DateFromStringE', actual }
}

export interface LiteralE<A extends Primitive> extends ActualE<unknown> {
  readonly _tag: 'LiteralE'
  readonly literals: NonEmptyArray<A>
}
export interface LiteralLE<A> extends LeafE<LiteralLE<A>> {}

export function literalE<A extends Primitive>(actual: unknown, literals: NonEmptyArray<A>): LiteralE<A> {
  return { _tag: 'LiteralE', literals, actual }
}

export interface NullableE<E> extends SingleE<E> {
  readonly _tag: 'NullableE'
}

export function nullableE<E>(error: E): NullableE<E> {
  return { _tag: 'NullableE', error }
}

export interface OptionalE<E> extends SingleE<E> {
  readonly _tag: 'OptionalE'
}

export function optionalE<E>(error: E): OptionalE<E> {
  return { _tag: 'OptionalE', error }
}

export interface MissingKeysE {
  readonly _tag: 'MissingKeysE'
  readonly keys: NonEmptyArray<string>
}

export function missingKeysE(keys: NonEmptyArray<string>): MissingKeysE {
  return { _tag: 'MissingKeysE', keys }
}

export interface UnexpectedKeysE {
  readonly _tag: 'UnexpectedKeysE'
  readonly keys: NonEmptyArray<string>
}

export function unexpectedKeysE(keys: NonEmptyArray<string>): UnexpectedKeysE {
  return { _tag: 'UnexpectedKeysE', keys }
}

export interface UnexpectedIndicesE {
  readonly _tag: 'UnexpectedIndicesE'
  readonly indices: NonEmptyArray<number>
}

export function unexpectedIndicesE(indices: NonEmptyArray<number>): UnexpectedIndicesE {
  return { _tag: 'UnexpectedIndicesE', indices }
}

export interface RequiredKeyE<K, E> extends SingleE<E> {
  readonly _tag: 'RequiredKeyE'
  readonly key: K
}

export function requiredKeyE<K, E>(key: K, error: E): RequiredKeyE<K, E> {
  return { _tag: 'RequiredKeyE', key, error }
}

export interface OptionalKeyE<K, E> extends SingleE<E> {
  readonly _tag: 'OptionalKeyE'
  readonly key: K
}

export function optionalKeyE<K, E>(key: K, error: E): OptionalKeyE<K, E> {
  return { _tag: 'OptionalKeyE', key, error }
}

export interface StructE<E> extends CompoundE<E> {
  readonly _tag: 'StructE'
}

export function structE<E>(errors: NonEmptyArray<E>): StructE<E> {
  return { _tag: 'StructE', errors }
}

export interface PartialE<E> extends CompoundE<E> {
  readonly _tag: 'PartialE'
}

export function partialE<E>(errors: NonEmptyArray<E>): PartialE<E> {
  return { _tag: 'PartialE', errors }
}

export interface IndicesE<E> extends CompoundE<E> {
  readonly _tag: 'IndicesE'
}

export function indicesE<E>(errors: NonEmptyArray<E>): IndicesE<E> {
  return { _tag: 'IndicesE', errors }
}

export interface MissingIndicesE {
  readonly _tag: 'MissingIndicesE'
  readonly indices: NonEmptyArray<number>
}

export function missingIndicesE(indices: NonEmptyArray<number>): MissingIndicesE {
  return { _tag: 'MissingIndicesE', indices }
}

export interface RequiredIndexE<I, E> extends SingleE<E> {
  readonly _tag: 'RequiredIndexE'
  readonly index: I
}

export function requiredIndexE<I, E>(index: I, error: E): RequiredIndexE<I, E> {
  return { _tag: 'RequiredIndexE', index, error }
}

export interface TupleE<E> extends CompoundE<E> {
  readonly _tag: 'TupleE'
}

export function tupleE<E>(errors: NonEmptyArray<E>): TupleE<E> {
  return { _tag: 'TupleE', errors }
}

export interface OptionalIndexE<I, E> extends SingleE<E> {
  readonly _tag: 'OptionalIndexE'
  readonly index: I
}

export function optionalIndexE<I, E>(index: I, error: E): OptionalIndexE<I, E> {
  return { _tag: 'OptionalIndexE', index, error }
}

export interface ArrayE<E> extends CompoundE<E> {
  readonly _tag: 'ArrayE'
}

export function arrayE<E>(errors: NonEmptyArray<E>): ArrayE<E> {
  return { _tag: 'ArrayE', errors }
}

export interface RecordE<E> extends CompoundE<E> {
  readonly _tag: 'RecordE'
}

export function recordE<E>(errors: NonEmptyArray<E>): RecordE<E> {
  return { _tag: 'RecordE', errors }
}

export interface UnionE<E> extends CompoundE<E> {
  readonly _tag: 'UnionE'
}

export function unionE<E>(errors: NonEmptyArray<E>): UnionE<E> {
  return { _tag: 'UnionE', errors }
}

export interface RefinementE<E> extends SingleE<E> {
  readonly _tag: 'RefinementE'
}

export function refinementE<E>(error: E): RefinementE<E> {
  return { _tag: 'RefinementE', error }
}

export interface ParserE<E> extends SingleE<E> {
  readonly _tag: 'ParserE'
}

export function parserE<E>(error: E): ParserE<E> {
  return { _tag: 'ParserE', error }
}

export interface IntersectionE<E> extends CompoundE<E> {
  readonly _tag: 'IntersectionE'
}

export function intersectionE<E>(errors: NonEmptyArray<E>): IntersectionE<E> {
  return { _tag: 'IntersectionE', errors }
}

export interface LazyE<E> extends SingleE<E> {
  readonly _tag: 'LazyE'
  readonly id: string
}

export function lazyE<E>(id: string, error: E): LazyE<E> {
  return { _tag: 'LazyE', id, error }
}

export interface MemberE<M, E> extends SingleE<E> {
  readonly _tag: 'MemberE'
  readonly member: M
}

export function memberE<M, E>(member: M, error: E): MemberE<M, E> {
  return { _tag: 'MemberE', member, error }
}

export interface TagNotFoundE<T, E> extends SingleE<E> {
  readonly _tag: 'TagNotFoundE'
  readonly tag: T
}

export function tagNotFoundE<T, E>(tag: T, error: E): TagNotFoundE<T, E> {
  return { _tag: 'TagNotFoundE', tag, error }
}

export interface SumE<E> extends CompoundE<E> {
  readonly _tag: 'SumE'
}

export function sumE<E>(errors: NonEmptyArray<E>): SumE<E> {
  return { _tag: 'SumE', errors }
}

export interface LabeledE<E> extends SingleE<E> {
  readonly _tag: 'LabeledE'
  readonly label: string
}

export function labeledE<E>(label: string, error: E): LabeledE<E> {
  return { _tag: 'LabeledE', label, error }
}

export interface MessageE<E> extends SingleE<E> {
  readonly _tag: 'MessageE'
  readonly message: string
}

export function messageE<E>(message: string, error: E): MessageE<E> {
  return { _tag: 'MessageE', message, error }
}

export interface CompositionE<E> extends CompoundE<E> {
  readonly _tag: 'CompositionE'
}

export function compositionE<E>(errors: NonEmptyArray<E>): CompositionE<E> {
  return { _tag: 'CompositionE', errors }
}

export interface PrevE<E> extends SingleE<E> {
  readonly _tag: 'PrevE'
}

export function prevE<E>(error: E): PrevE<E> {
  return { _tag: 'PrevE', error }
}

export interface NextE<E> extends SingleE<E> {
  readonly _tag: 'NextE'
}

export function nextE<E>(error: E): NextE<E> {
  return { _tag: 'NextE', error }
}

export type DecodeErrorPaths<E> =
  | { actual: unknown, expected: unknown }
  | {
      [k: string]: DecodeErrorPaths<E>
    }

/*
 * -------------------------------------------
 * fold
 * -------------------------------------------
 */

function foldEval<E, B>(
  de: DecodeError<E>,
  leaf: (e: E) => B,
  patterns: {
    ArrayE: (bs: NonEmptyArray<B>) => B
    CompositionE: (bs: NonEmptyArray<B>) => B
    IntersectionE: (bs: NonEmptyArray<B>) => B
    LazyE: (id: string, b: B) => B
    MemberE: (member: string | number, b: B) => B
    MissingIndexesE: (indexes: NonEmptyArray<number>) => B
    MissingKeysE: (keys: NonEmptyArray<string>) => B
    NullableE: (b: B) => B
    OptionalE: (b: B) => B
    OptionalIndexE: (index: number, b: B) => B
    OptionalKeyE: (key: string, b: B) => B
    ParserE: (b: B) => B
    PartialE: (bs: NonEmptyArray<B>) => B
    RecordE: (bs: NonEmptyArray<B>) => B
    RefinementE: (b: B) => B
    RequiredIndexE: (index: number, b: B) => B
    RequiredKeyE: (key: string, b: B) => B
    StructE: (bs: NonEmptyArray<B>) => B
    SumE: (bs: NonEmptyArray<B>) => B
    TagE: (tag: string, b: B) => B
    TupleE: (bs: NonEmptyArray<B>) => B
    UnexpectedIndexesE: (keys: NonEmptyArray<number>) => B
    UnexpectedKeysE: (keys: NonEmptyArray<string>) => B
    UnionE: (bs: NonEmptyArray<B>) => B
    MessageE: (message: string, b: B) => B
    LabeledE: (label: string, b: B) => B
  }
): Eval<B> {
  return Ev.defer(() => {
    switch (de._tag) {
      case 'ArrayE':
      case 'RecordE':
      case 'CompositionE':
      case 'IntersectionE':
      case 'PartialE':
      case 'StructE':
      case 'SumE':
      case 'TupleE':
      case 'UnionE': {
        return pipe(
          de.errors,
          NA.traverse(Ev.Applicative)((e) => foldEval(e, leaf, patterns)),
          Ev.map(patterns[de._tag])
        )
      }
      case 'LazyE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.LazyE(de.id, b))
        )
      }
      case 'MemberE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.MemberE(de.member, b))
        )
      }
      case 'MissingIndicesE': {
        return Ev.now(patterns.MissingIndexesE(de.indices))
      }
      case 'MissingKeysE': {
        return Ev.now(patterns.MissingKeysE(de.keys))
      }
      case 'UnexpectedIndicesE': {
        return Ev.now(patterns.UnexpectedIndexesE(de.indices))
      }
      case 'UnexpectedKeysE': {
        return Ev.now(patterns.UnexpectedKeysE(de.keys))
      }
      case 'NullableE':
      case 'OptionalE':
      case 'RefinementE':
      case 'ParserE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns[de._tag](b))
        )
      }
      case 'RequiredIndexE':
      case 'OptionalIndexE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns[de._tag](de.index, b))
        )
      }
      case 'RequiredKeyE':
      case 'OptionalKeyE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns[de._tag](de.key, b))
        )
      }
      case 'TagNotFoundE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.TagE(de.tag, b))
        )
      }
      case 'MessageE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.MessageE(de.message, b))
        )
      }
      case 'LabeledE': {
        return pipe(
          foldEval(de.error, leaf, patterns),
          Ev.map((b) => patterns.LabeledE(de.label, b))
        )
      }
      case 'LeafE': {
        return Ev.now(leaf(de.error))
      }
    }
  })
}

export function fold_<E, B>(
  de: DecodeError<E>,
  leaf: (e: E) => B,
  patterns: {
    ArrayE: (bs: NonEmptyArray<B>) => B
    CompositionE: (bs: NonEmptyArray<B>) => B
    IntersectionE: (bs: NonEmptyArray<B>) => B
    LazyE: (id: string, b: B) => B
    MemberE: (member: string | number, b: B) => B
    MissingIndexesE: (indexes: NonEmptyArray<number>) => B
    MissingKeysE: (keys: NonEmptyArray<string>) => B
    NullableE: (b: B) => B
    OptionalE: (b: B) => B
    OptionalIndexE: (index: number, b: B) => B
    OptionalKeyE: (key: string, b: B) => B
    ParserE: (b: B) => B
    PartialE: (bs: NonEmptyArray<B>) => B
    RecordE: (bs: NonEmptyArray<B>) => B
    RefinementE: (b: B) => B
    RequiredIndexE: (index: number, b: B) => B
    RequiredKeyE: (key: string, b: B) => B
    StructE: (bs: NonEmptyArray<B>) => B
    SumE: (bs: NonEmptyArray<B>) => B
    TagE: (tag: string, b: B) => B
    TupleE: (bs: NonEmptyArray<B>) => B
    UnexpectedIndexesE: (keys: NonEmptyArray<number>) => B
    UnexpectedKeysE: (keys: NonEmptyArray<string>) => B
    UnionE: (bs: NonEmptyArray<B>) => B
    MessageE: (message: string, b: B) => B
    LabeledE: (label: string, b: B) => B
  }
): B {
  return foldEval(de, leaf, patterns).value
}

export function fold<E, B>(
  leaf: (e: E) => B,
  patterns: {
    ArrayE: (bs: NonEmptyArray<B>) => B
    CompositionE: (bs: NonEmptyArray<B>) => B
    IntersectionE: (bs: NonEmptyArray<B>) => B
    LazyE: (id: string, b: B) => B
    MemberE: (member: string | number, b: B) => B
    MissingIndexesE: (indexes: NonEmptyArray<number>) => B
    MissingKeysE: (keys: NonEmptyArray<string>) => B
    NullableE: (b: B) => B
    OptionalE: (b: B) => B
    OptionalIndexE: (index: number, b: B) => B
    OptionalKeyE: (key: string, b: B) => B
    ParserE: (b: B) => B
    PartialE: (bs: NonEmptyArray<B>) => B
    RecordE: (bs: NonEmptyArray<B>) => B
    RefinementE: (b: B) => B
    RequiredIndexE: (index: number, b: B) => B
    RequiredKeyE: (key: string, b: B) => B
    StructE: (bs: NonEmptyArray<B>) => B
    SumE: (bs: NonEmptyArray<B>) => B
    TagE: (tag: string, b: B) => B
    TupleE: (bs: NonEmptyArray<B>) => B
    UnexpectedIndexesE: (keys: NonEmptyArray<number>) => B
    UnexpectedKeysE: (keys: NonEmptyArray<string>) => B
    UnionE: (bs: NonEmptyArray<B>) => B
    MessageE: (message: string, b: B) => B
    LabeledE: (label: string, b: B) => B
  }
): (de: DecodeError<E>) => B {
  return (de) => fold_(de, leaf, patterns)
}

export function toTreeWith_<E>(de: DecodeError<E>, toTree: (e: E) => RoseTree<string>): RoseTree<string> {
  return fold_(de, toTree, {
    ArrayE: (bs) => RT.make(`${bs.length} error(s) found while decoding an array`, bs),
    CompositionE: (bs) =>
      bs.length === 1 ? bs[0] : RT.make(`${bs.length} error(s) found while decoding a composition`, bs),
    IntersectionE: (bs) => RT.make(`${bs.length} error(s) found while decoding an intersection`, bs),
    StructE: (bs) => RT.make(`${bs.length} error(s) found while decoding a struct`, bs),
    PartialE: (bs) => RT.make(`${bs.length} error(s) found while decoding a partial`, bs),
    RecordE: (bs) => RT.make(`${bs.length} error(s) found while decoding a record`, bs),
    TupleE: (bs) => RT.make(`${bs.length} error(s) found while decoding a tuple`, bs),
    UnionE: (bs) => RT.make(`${bs.length} error(s) found while decoding a union`, bs),
    SumE: (bs) => RT.make(`${bs.length} error(s) found while decoding a sum`, bs),
    TagE: (tag, b) => RT.make(`1 error found while decoding the sum tag ${tag}`, [b]),
    LazyE: (id, b) => RT.make(`1 error found while decoding the lazy decoder ${id}`, [b]),
    MessageE: (message, b) => RT.make(`with the message: ${message}`, [b]),
    LabeledE: (label, b) => RT.make(`with the label ${label}`, [b]),
    MemberE: (member, b) => RT.make(`on member ${member}`, [b]),
    OptionalIndexE: (index, b) => RT.make(`on index ${index}`, [b]),
    RequiredIndexE: (index, b) => RT.make(`on component ${index}`, [b]),
    OptionalKeyE: (key, b) => RT.make(`on key ${key}`, [b]),
    RequiredKeyE: (key, b) => RT.make(`on key ${key}`, [b]),
    MissingIndexesE: (indices) =>
      RT.make(
        `${indices.length} error(s) found while checking indices`,
        A.map_(indices, (index) => RT.make(`missing required index ${index}`, []))
      ),
    MissingKeysE: (keys) =>
      RT.make(
        `${keys.length} error(s) found while checking indices`,
        A.map_(keys, (key) => RT.make(`missing required key ${key}`, []))
      ),
    UnexpectedIndexesE: (indices) =>
      RT.make(
        `${indices.length} error(s) found while checking indices`,
        A.map_(indices, (index) => RT.make(`unexpected index ${index}`, []))
      ),
    UnexpectedKeysE: (keys) =>
      RT.make(
        `${keys.length} error(s) found while checking indices`,
        A.map_(keys, (key) => RT.make(`unexpected key ${key}`, []))
      ),
    NullableE: (b) => RT.make('1 error found while decoding a nullable', [b]),
    OptionalE: (b) => RT.make('1 error found while decoding an optional', [b]),
    RefinementE: (b) => RT.make('1 error found while decoding a refinement', [b]),
    ParserE: (b) => RT.make('1 error found while decoding a parser', [b])
  })
}

export function toTreeWith<E>(toTree: (e: E) => RoseTree<string>): (de: DecodeError<E>) => RoseTree<string> {
  return (de) => toTreeWith_(de, toTree)
}

const cannotDecode = (u: unknown, expected: string): string =>
  `cannot decode ${JSON.stringify(u)}, expected ${expected}`

export function toTreeBuiltin(de: BuiltinE): RoseTree<string> {
  switch (de._tag) {
    case 'StringE':
      return RT.make(cannotDecode(de.actual, 'a string'), [])
    case 'NumberE':
      return RT.make(cannotDecode(de.actual, 'a number'), [])
    case 'BooleanE':
      return RT.make(cannotDecode(de.actual, 'a boolean'), [])
    case 'UnknownArrayE':
      return RT.make(cannotDecode(de.actual, 'an array'), [])
    case 'UnknownRecordE':
      return RT.make(cannotDecode(de.actual, 'an object'), [])
    case 'NaNE':
      return RT.make('value is NaN', [])
    case 'InfinityE':
      return RT.make('value is Infinity', [])
    case 'BigIntE':
      return RT.make(cannotDecode(de.actual, 'a string coercable into a bigint'), [])
    case 'EmptyE':
      return RT.make('array contains no elements', [])
    case 'LiteralE':
      return RT.make(
        cannotDecode(
          de.actual,
          `one of ${pipe(
            de.literals,
            A.map((literal) => JSON.stringify(literal)),
            A.join(', ')
          )}`
        ),
        []
      )
  }
}

/*
 * -------------------------------------------
 * utils
 * -------------------------------------------
 */

const toTree = toTreeWith(toTreeBuiltin)

export const draw = Th.mapLeft(flow(toTree, RT.drawTree(Str.Show)))

const printValue    = <A>(a: A): string => 'Value:\n' + JSON.stringify(a, null, 2)
const printErrors   = (s: string): string => (s === '' ? s : 'Errors:\n' + s)
const printWarnings = (s: string): string => (s === '' ? s : 'Warnings:\n' + s)

export const print = Th.match(printErrors, printValue, (e, a) => printValue(a) + '\n' + printWarnings(e))
export const debug = flow(draw, print, console.log)

function isNotNull<A>(a: A): a is NonNullable<A> {
  return a !== null
}

export type Prunable = ReadonlyArray<string>

function collectPrunable<E>(de: DecodeError<E>): Prunable {
  const go = (de: DecodeError<E>): Prunable => {
    switch (de._tag) {
      case 'ArrayE':
      case 'CompositionE':
      case 'IntersectionE':
      case 'PartialE':
      case 'RecordE':
      case 'StructE':
      case 'SumE':
      case 'TupleE':
      case 'UnionE':
        return pipe(de.errors, A.bind(go))
      case 'LazyE':
      case 'MemberE':
      case 'NullableE':
      case 'ParserE':
      case 'RefinementE':
      case 'TagNotFoundE':
      case 'OptionalE':
      case 'LabeledE':
      case 'MessageE':
        return go(de.error)
      case 'LeafE':
      case 'MissingIndicesE':
      case 'MissingKeysE':
        return A.empty()
      case 'OptionalIndexE':
        return go(de.error).map((s) => String(de.index) + '.' + s)
      case 'OptionalKeyE':
        return go(de.error).map((s) => de.key + '.' + s)
      case 'RequiredIndexE':
        return go(de.error).map((s) => String(de.index) + '.' + s)
      case 'RequiredKeyE':
        return go(de.error).map((s) => de.key + '.' + s)
      case 'UnexpectedIndicesE':
        return de.indices.map(String)
      case 'UnexpectedKeysE':
        return de.keys
    }
  }
  return go(de)
}

function prune<E>(de: DecodeError<E>, prunable: Prunable, anticollision: string): DecodeError<E> | null {
  switch (de._tag) {
    case 'ArrayE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? arrayE(pdes) : null
    }
    case 'CompositionE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? compositionE(pdes) : null
    }
    case 'IntersectionE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? intersectionE(pdes) : null
    }
    case 'LazyE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? lazyE(de.id, pde) : null
    }
    case 'LeafE':
      return de
    case 'MemberE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? memberE(de.member, pde) : null
    }
    case 'MissingIndicesE':
      return de
    case 'MissingKeysE':
      return de
    case 'NullableE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? nullableE(pde) : null
    }
    case 'OptionalIndexE': {
      const pde = prune(de.error, prunable, anticollision + de.index + '.')
      return pde ? optionalIndexE(de.index, pde) : null
    }
    case 'OptionalKeyE': {
      const pde = prune(de.error, prunable, anticollision + de.key + '.')
      return pde ? optionalKeyE(de.key, pde) : null
    }
    case 'ParserE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? parserE(pde) : null
    }
    case 'PartialE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? partialE(pdes) : null
    }
    case 'RecordE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? recordE(pdes) : null
    }
    case 'RefinementE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? refinementE(pde) : null
    }
    case 'RequiredIndexE': {
      const pde = prune(de.error, prunable, anticollision + de.index + '.')
      return pde ? requiredIndexE(de.index, pde) : null
    }
    case 'RequiredKeyE': {
      const pde = prune(de.error, prunable, anticollision + de.key + '.')
      return pde ? requiredKeyE(de.key, pde) : null
    }
    case 'StructE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? structE(pdes) : null
    }
    case 'SumE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? sumE(pdes) : null
    }
    case 'TagNotFoundE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? tagNotFoundE(de.tag, pde) : null
    }
    case 'TupleE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? tupleE(pdes) : null
    }
    case 'UnexpectedIndicesE': {
      const pindexes = de.indices.filter((index) => prunable.indexOf(anticollision + String(index)) !== -1)
      return A.isNonEmpty(pindexes) ? unexpectedIndicesE(pindexes) : null
    }
    case 'UnexpectedKeysE': {
      const pkeys = de.keys.filter((key) => prunable.indexOf(anticollision + key) !== -1)
      return A.isNonEmpty(pkeys) ? unexpectedKeysE(pkeys) : null
    }
    case 'UnionE': {
      const pdes = de.errors.map((e) => prune(e, prunable, anticollision)).filter(isNotNull)
      return A.isNonEmpty(pdes) ? unionE(pdes) : null
    }
    case 'LabeledE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? labeledE(de.label, pde) : null
    }
    case 'MessageE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? messageE(de.message, pde) : null
    }
    case 'OptionalE': {
      const pde = prune(de.error, prunable, anticollision)
      return pde ? optionalE(pde) : null
    }
  }
}

export function pruneDifference(des: NonEmptyArray<MemberE<number, any>>): IntersectionE<MemberE<number, any>> | null {
  if (des.length === 1) {
    return intersectionE([memberE(0, des[0])])
  } else {
    let errors: Array<MemberE<number, DecodeError<any>>> = []

    const de0  = des[0].error
    const de1  = des[1].error
    const pde0 = prune(de0, collectPrunable(de1), '')
    const pde1 = prune(de1, collectPrunable(de0), '')
    pde0 && errors.push(memberE(0, pde0))
    pde1 && errors.push(memberE(1, pde1))
    const rest = des.slice(2)
    if (A.isNonEmpty(rest)) {
      for (let i = 0; i < rest.length; i++) {
        const dei      = rest[i].error
        const prunable = A.bind_(errors, collectPrunable)
        if (A.isNonEmpty(errors)) {
          errors = pipe(
            errors,
            A.map((de) => prune(de, collectPrunable(dei), '')),
            A.filter(isNotNull)
          ) as typeof errors

          const pdei = prune(dei, prunable, '')
          pdei && errors.push(memberE(i + 2, pdei))
        } else if (rest[i + 1]) {
          const dei1  = rest[i + 1].error
          const pdei  = prune(dei, collectPrunable(dei1), '')
          const pdei1 = prune(dei1, collectPrunable(dei), '')
          pdei && errors.push(memberE(i + 2, pdei))
          pdei1 && errors.push(memberE(i + 3, pdei1))
          i++
        } else {
          errors.push(memberE(i + 2, dei))
        }
      }
    }
    return A.isNonEmpty(errors) ? intersectionE(errors) : null
  }
}
