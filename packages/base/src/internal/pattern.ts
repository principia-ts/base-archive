/**
 * Forked from https://github.com/gvergnaud/ts-pattern
 */
import type { Predicate, Refinement } from '../Function'
import type { Option } from '../Option'
import type { Compute } from '../util/compute'
import type { Primitive, UnionToIntersection, UnionToTuple } from '../util/types'

import * as A from '../Array'
import { pipe } from '../Function'
import * as O from '../Option'
import * as R from '../Record'

export const $string          = Symbol.for('@@pattern/string')
export const $number          = Symbol.for('@@pattern/number')
export const $boolean         = Symbol.for('@@pattern/boolean')
export const $guard           = Symbol.for('@@pattern/guard')
export const $not             = Symbol.for('@@pattern/not')
export const $namedSelect     = Symbol.for('@@pattern/named-select')
export const $anonymousSelect = Symbol.for('@@pattern/anonymous-select')

export const __ = {
  string: $string,
  number: $number,
  boolean: $boolean
} as const

const isObject = (value: unknown): value is Object => Boolean(value && typeof value === 'object')

const isArray = (value: unknown): value is any[] => Array.isArray(value)

const isGuardPattern = (x: unknown): x is GuardPattern<unknown> => {
  const pattern = x as GuardPattern<unknown>
  return pattern && pattern['@@pattern/__patternKind'] === $guard && typeof pattern['@@pattern/__when'] === 'function'
}

const isNotPattern = (x: unknown): x is NotPattern<unknown> => {
  const pattern = x as NotPattern<unknown>
  return pattern && pattern['@@pattern/__patternKind'] === $not
}

const isNamedSelectPattern = (x: unknown): x is NamedSelectPattern<string> => {
  const pattern = x as NamedSelectPattern<string>
  return pattern && pattern['@@pattern/__patternKind'] === $namedSelect
}

const isAnonymousSelectPattern = (x: unknown): x is AnonymousSelectPattern => {
  const pattern = x as AnonymousSelectPattern
  return pattern && pattern['@@pattern/__patternKind'] === $anonymousSelect
}

const isListPattern = (x: unknown): x is [Pattern<unknown>] => {
  return Array.isArray(x) && x.length === 1
}

// tells us if the value matches a given pattern.
export const matchPattern = <a, p extends Pattern<a>>(pattern: p, value: a): boolean => {
  if (pattern === __ || isNamedSelectPattern(pattern) || isAnonymousSelectPattern(pattern)) return true

  if (pattern === __.string) return typeof value === 'string'
  if (pattern === __.boolean) return typeof value === 'boolean'
  if (pattern === __.number) {
    return typeof value === 'number' && !Number.isNaN(value)
  }
  if (isGuardPattern(pattern)) return Boolean(pattern['@@pattern/__when'](value))
  if (isNotPattern(pattern)) return !matchPattern(pattern['@@pattern/__pattern'] as Pattern<a>, value)
  if (isListPattern(pattern)) return isArray(value) ? value.every((v) => matchPattern(pattern[0], v)) : false

  if (typeof pattern !== typeof value) return false

  if (isArray(pattern)) {
    return isArray(value) && pattern.length === value.length
      ? pattern.every((subPattern, i) => matchPattern(subPattern, value[i]))
      : false
  }

  if (pattern instanceof Map) {
    if (!(value instanceof Map)) return false
    return [...pattern.keys()].every((key) => matchPattern(pattern.get(key), value.get(key)))
  }

  if (pattern instanceof Set) {
    if (!(value instanceof Set)) return false

    const patternValues = [...pattern.values()]
    const allValues     = [...value.values()]
    return patternValues.length === 0
      ? allValues.length === 0
      : patternValues.length === 1
      ? patternValues.every((subPattern) =>
          Object.values(__).includes(subPattern) ? matchPattern([subPattern], allValues) : value.has(subPattern)
        )
      : patternValues.every((subPattern) => value.has(subPattern))
  }

  if (isObject(pattern)) {
    if (!isObject(value)) return false

    return Object.keys(pattern).every((k: string): boolean => matchPattern(pattern[k], value[k]))
  }
  return value === pattern
}

export const selectWithPattern = <a, p extends Pattern<a>>(pattern: p, value: a) => {
  const positional = selectPositionalWithPattern(pattern, value)
  const kwargs     = selectKwargsWithPattern(pattern, value)

  return O.isSome(positional) ? positional.value : Object.keys(kwargs).length ? kwargs : value
}

/*
 * type Option<T> = { kind: 'some', value: T } | { kind: 'none' }
 * const none: Option<never> = { kind: 'none' }
 */

export const selectPositionalWithPattern = <a, p extends Pattern<a>>(pattern: p, value: a): Option<unknown> => {
  if (isAnonymousSelectPattern(pattern)) return O.Some(value)

  if (isListPattern(pattern) && isArray(value)) {
    return pipe(
      value,
      A.map((v) => selectPositionalWithPattern(pattern[0], v)),
      A.filter(O.isSome),
      A.foldl(O.None<ReadonlyArray<unknown>>(), (acc, selection) =>
        O.isNone(acc) ? O.Some([selection.value]) : O.Some(A.append_(acc.value, selection.value))
      )
    )
    /*
     * return value
     *   .map((v) => selectPositionalWithPattern(pattern[0], v))
     *   .filter((selection): selection is { kind: 'some', value: unknown } => selection.kind === 'some')
     *   .reduce<Option<unknown[]>>((acc, selection) => {
     *     return acc.kind === 'none'
     *       ? { kind: 'some', value: [selection.value] }
     *       : { kind: 'some', value: acc.value.concat([selection.value]) }
     *   }, none)
     */
  }

  if (isArray(pattern) && isArray(value)) {
    return pattern.length <= value.length
      ? A.ifoldl_(pattern, O.None(), (acc, i, subPattern) =>
          O.isSome(acc) ? acc : selectPositionalWithPattern(subPattern, value[i])
        )
      : O.None()
  }

  if (isObject(pattern) && isObject(value)) {
    return A.foldl_(R.keys(pattern as Record<string, any>), O.None(), (acc, k) =>
      O.isSome(acc) ? acc : selectPositionalWithPattern(pattern[k], value[k])
    )
  }

  return O.None()
}

const selectKwargsWithPattern = <a, p extends Pattern<a>>(pattern: p, value: a): Record<string, unknown> => {
  if (isNamedSelectPattern(pattern)) return { [pattern['@@pattern/__key']]: value }

  if (isListPattern(pattern) && isArray(value)) {
    return pipe(
      value,
      A.map((v) => selectKwargsWithPattern(pattern[0], v)),
      A.foldl({} as Record<string, ReadonlyArray<unknown>>, (acc, selections) =>
        pipe(
          R.keys(selections),
          A.foldl(acc, (mut_acc, key) => {
            mut_acc[key] = A.append_(mut_acc[key] || [], selections[key])
            return mut_acc
          })
        )
      )
    )
    /*
     * return value
     *   .map((v) => selectKwargsWithPattern(pattern[0], v))
     *   .reduce<Record<string, unknown[]>>((acc, selections) => {
     *     return Object.keys(selections).reduce((acc, key) => {
     *       acc[key] = (acc[key] || []).concat([selections[key]])
     *       return acc
     *     }, acc)
     *   }, {})
     */
  }

  if (isArray(pattern) && isArray(value)) {
    return pattern.length <= value.length
      ? A.ifoldl_(pattern, {}, (acc, i, subPattern) =>
          Object.assign(acc, selectKwargsWithPattern(subPattern, value[i]))
        )
      : {}
  }

  if (isObject(pattern) && isObject(value)) {
    return A.foldl_(R.keys(pattern as Record<string, any>), {}, (acc, k) =>
      Object.assign(acc, selectKwargsWithPattern(pattern[k], value[k]))
    )
    /*
     * return Object.keys(pattern).reduce(
     *   (acc, k: string) =>
     *     // @ts-ignore
     *     Object.assign(acc, selectKwargsWithPattern(pattern[k], value[k])),
     *   {}
     * )
     */
  }

  return {}
}

/*
 * ---------------------------------------------------------------------------------------------------
 * ---------------------------------------------------------------------------------------------------
 */

export type GuardValue<F> = F extends Refinement<any, infer B> ? B : F extends Predicate<infer A> ? A : never

type WildCardPattern<A> = A extends number
  ? typeof $number
  : A extends string
  ? typeof $string
  : A extends boolean
  ? typeof $boolean
  : never

export type GuardPattern<A, B extends A = never> = {
  /** @deprecated This property should only be used by ts-pattern's internals. */
  '@@pattern/__patternKind': typeof $guard
  /** @deprecated This property should only be used by ts-pattern's internals. */
  '@@pattern/__when': Predicate<A> | Refinement<A, B>
}

export type NotPattern<A> = {
  /** @deprecated This property should only be used by ts-pattern's internals. */
  '@@pattern/__patternKind': typeof $not
  /** @deprecated This property should only be used by ts-pattern's internals. */
  '@@pattern/__pattern': Pattern<A>
}

export type AnonymousSelectPattern = {
  /** @deprecated This property should only be used by ts-pattern's internals. */
  '@@pattern/__patternKind': typeof $anonymousSelect
}

export type NamedSelectPattern<K extends string> = {
  /** @deprecated This property should only be used by ts-pattern's internals. */
  '@@pattern/__patternKind': typeof $namedSelect
  /** @deprecated This property should only be used by ts-pattern's internals. */
  '@@pattern/__key': K
}

export type Pattern<A> =
  | typeof __
  | AnonymousSelectPattern
  | NamedSelectPattern<string>
  | GuardPattern<A>
  | NotPattern<A | any>
  | WildCardPattern<A>
  | (A extends Primitive
      ? A
      : A extends ReadonlyArray<infer I>
      ? A extends readonly [infer A1, infer A2, infer A3, infer A4, infer A5]
        ? readonly [Pattern<A1>, Pattern<A2>, Pattern<A3>, Pattern<A4>, Pattern<A5>]
        : A extends readonly [infer A1, infer A2, infer A3, infer A4]
        ? readonly [Pattern<A1>, Pattern<A2>, Pattern<A3>, Pattern<A4>]
        : A extends readonly [infer A1, infer A2, infer A3]
        ? readonly [Pattern<A1>, Pattern<A2>, Pattern<A3>]
        : A extends readonly [infer A1, infer A2]
        ? readonly [Pattern<A1>, Pattern<A2>]
        :
            | readonly []
            | readonly [Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>, Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>, Pattern<I>, Pattern<I>]
            | readonly [Pattern<I>, Pattern<I>, Pattern<I>, Pattern<I>, Pattern<I>]
      : A extends Map<infer K, infer V>
      ? ReadonlyMap<K, Pattern<V>>
      : A extends Set<infer V>
      ? ReadonlySet<Pattern<V>>
      : IsPlainObject<A> extends true
      ? { readonly [K in keyof A]?: Pattern<A[K]> }
      : A)

export type InvertPattern<P> = P extends typeof __.number
  ? number
  : P extends typeof __.string
  ? string
  : P extends typeof __.boolean
  ? boolean
  : P extends NamedSelectPattern<any> | AnonymousSelectPattern | typeof __
  ? unknown
  : P extends GuardPattern<infer P1, infer P2>
  ? [P2] extends [never]
    ? P1
    : P2
  : P extends NotPattern<infer A1>
  ? NotPattern<InvertPattern<A1>>
  : P extends Primitive
  ? P
  : P extends readonly (infer PP)[]
  ? P extends readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
    ? [InvertPattern<P1>, InvertPattern<P2>, InvertPattern<P3>, InvertPattern<P4>, InvertPattern<P5>]
    : P extends readonly [infer P1, infer P2, infer P3, infer P4]
    ? [InvertPattern<P1>, InvertPattern<P2>, InvertPattern<P3>, InvertPattern<P4>]
    : P extends readonly [infer P1, infer P2, infer P3]
    ? [InvertPattern<P1>, InvertPattern<P2>, InvertPattern<P3>]
    : P extends readonly [infer P1, infer P2]
    ? [InvertPattern<P1>, InvertPattern<P2>]
    : InvertPattern<PP>[]
  : P extends Map<infer PK, infer PV>
  ? Map<PK, InvertPattern<PV>>
  : P extends Set<infer PV>
  ? Set<InvertPattern<PV>>
  : IsPlainObject<P> extends true
  ? { [K in keyof P]: InvertPattern<P[K]> }
  : P

type InvertPatternForExclude<P, I> = P extends NotPattern<infer P1>
  ? Exclude<I, P1>
  : P extends typeof __.number
  ? number
  : P extends typeof __.string
  ? string
  : P extends typeof __.boolean
  ? boolean
  : P extends NamedSelectPattern<any> | AnonymousSelectPattern | typeof __
  ? unknown
  : P extends GuardPattern<any, infer P1>
  ? P1
  : P extends Primitive
  ? IsLiteral<P> extends true
    ? P
    : IsLiteral<I> extends true
    ? P
    : never
  : P extends ReadonlyArray<infer PP>
  ? I extends ReadonlyArray<infer II>
    ? P extends readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
      ? I extends readonly [infer I1, infer I2, infer I3, infer I4, infer I5]
        ? [
            InvertPatternForExclude<P1, I1>,
            InvertPatternForExclude<P2, I2>,
            InvertPatternForExclude<P3, I3>,
            InvertPatternForExclude<P4, I4>,
            InvertPatternForExclude<P5, I5>
          ]
        : never
      : P extends readonly [infer P1, infer P2, infer P3, infer P4]
      ? I extends readonly [infer I1, infer I2, infer I3, infer I4]
        ? [
            InvertPatternForExclude<P1, I1>,
            InvertPatternForExclude<P2, I2>,
            InvertPatternForExclude<P3, I3>,
            InvertPatternForExclude<P4, I4>
          ]
        : never
      : P extends readonly [infer P1, infer P2, infer P3]
      ? I extends readonly [infer I1, infer I2, infer I3]
        ? [InvertPatternForExclude<P1, I1>, InvertPatternForExclude<P2, I2>, InvertPatternForExclude<P3, I3>]
        : never
      : P extends readonly [infer P1, infer P2]
      ? I extends readonly [infer I1, infer I2]
        ? [InvertPatternForExclude<P1, I1>, InvertPatternForExclude<P2, I2>]
        : never
      : InvertPatternForExclude<PP, II>[]
    : never
  : P extends Map<infer PK, infer PV>
  ? I extends Map<any, infer IV>
    ? Map<PK, InvertPatternForExclude<PV, IV>>
    : never
  : P extends Set<infer PV>
  ? I extends Set<infer IV>
    ? Set<InvertPatternForExclude<PV, IV>>
    : never
  : IsPlainObject<P> extends true
  ? I extends object
    ? [keyof P & keyof I] extends [never]
      ? never
      : {
          [K in keyof P & keyof I]: InvertPatternForExclude<P[K], I[K]>
        }
    : never
  : never

type ExtractPreciseValue<A, B> = unknown extends B
  ? A
  : IsAny<A> extends true
  ? B
  : ExcludeIfContainsNever<
      B extends readonly []
        ? []
        : B extends NotPattern<infer B1>
        ? Exclude<A, B1>
        : B extends readonly (infer BItem)[]
        ? A extends readonly (infer AItem)[]
          ? B extends readonly [infer B1, infer B2, infer B3, infer B4, infer B5]
            ? A extends readonly [infer A1, infer A2, infer A3, infer A4, infer A5]
              ? [
                  ExtractPreciseValue<A1, B1>,
                  ExtractPreciseValue<A2, B2>,
                  ExtractPreciseValue<A3, B3>,
                  ExtractPreciseValue<A4, B4>,
                  ExtractPreciseValue<A5, B5>
                ]
              : LeastUpperBound<A, B>
            : B extends readonly [infer B1, infer B2, infer B3, infer B4]
            ? A extends readonly [infer A1, infer A2, infer A3, infer A4]
              ? [
                  ExtractPreciseValue<A1, B1>,
                  ExtractPreciseValue<A2, B2>,
                  ExtractPreciseValue<A3, B3>,
                  ExtractPreciseValue<A4, B4>
                ]
              : LeastUpperBound<A, B>
            : B extends readonly [infer B1, infer B2, infer B3]
            ? A extends readonly [infer A1, infer A2, infer A3]
              ? [ExtractPreciseValue<A1, B1>, ExtractPreciseValue<A2, B2>, ExtractPreciseValue<A3, B3>]
              : LeastUpperBound<A, B>
            : B extends readonly [infer B1, infer B2]
            ? A extends readonly [infer A1, infer A2]
              ? [ExtractPreciseValue<A1, B1>, ExtractPreciseValue<A2, B2>]
              : LeastUpperBound<A, B>
            : ExtractPreciseValue<AItem, BItem>[]
          : LeastUpperBound<A, B>
        : B extends Map<infer BK, infer BV>
        ? A extends Map<infer AK, infer AV>
          ? ReadonlyMap<ExtractPreciseValue<AK, BK>, ExtractPreciseValue<AV, BV>>
          : LeastUpperBound<A, B>
        : B extends Set<infer BV>
        ? A extends Set<infer AV>
          ? ReadonlySet<ExtractPreciseValue<AV, BV>>
          : LeastUpperBound<A, B>
        : IsPlainObject<B> extends true
        ? A extends object
          ? A extends B
            ? A
            : B extends A
            ? B
            : [keyof A & keyof B] extends [never]
            ? never
            : {
                [K in keyof Required<A>]: K extends keyof B ? ExtractPreciseValue<A[K], B[K]> : A[K]
              }
          : LeastUpperBound<A, B>
        : LeastUpperBound<A, B>,
      B
    >

type ExcludeIfContainsNever<A, B> = B extends Map<any, any> | Set<any>
  ? A
  : B extends readonly [any, ...any]
  ? ExcludeNeverObject<A, B, '0' | '1' | '2' | '3' | '4'>
  : B extends any[]
  ? ExcludeNeverObject<A, B, number>
  : ExcludeNeverObject<A, B, string>

type ExcludeNeverObject<A, B, KeyConstraint = unknown> = A extends any
  ? {
      [k in KeyConstraint & keyof B & keyof A]-?: [A[k]] extends [never] ? 'exclude' : 'include'
    }[KeyConstraint & keyof B & keyof A] extends infer IncludeOrExclude
    ? (IncludeOrExclude extends 'include' ? ('include' extends IncludeOrExclude ? true : false) : false) extends true
      ? A
      : never
    : never
  : never

export type MatchedValue<A, I, _ = WithDefault<ExtractPreciseValue<A, I>, A>> = _ extends Array<unknown> ? _ : never

export type FindSelectionUnion<
  I,
  P,
  // path just serves as an id, to identify different anonymous patterns which have the same type
  Path extends any[] = []
> = P extends NamedSelectPattern<infer K>
  ? { [KK in K]: [I, Path] }
  : P extends AnonymousSelectPattern
  ? { [KK in typeof $anonymousSelect]: [I, Path] }
  : P extends readonly (infer PP)[]
  ? I extends readonly (infer II)[]
    ? [I, P] extends [
        readonly [infer I1, infer I2, infer I3, infer I4, infer I5],
        readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
      ]
      ?
          | FindSelectionUnion<I1, P1, [...Path, 1]>
          | FindSelectionUnion<I2, P2, [...Path, 2]>
          | FindSelectionUnion<I3, P3, [...Path, 3]>
          | FindSelectionUnion<I4, P4, [...Path, 4]>
          | FindSelectionUnion<I5, P5, [...Path, 5]>
      : [I, P] extends [
          readonly [infer I1, infer I2, infer I3, infer I4],
          readonly [infer P1, infer P2, infer P3, infer P4]
        ]
      ?
          | FindSelectionUnion<I1, P1, [...Path, 1]>
          | FindSelectionUnion<I2, P2, [...Path, 2]>
          | FindSelectionUnion<I3, P3, [...Path, 3]>
          | FindSelectionUnion<I4, P4, [...Path, 4]>
      : [I, P] extends [readonly [infer I1, infer I2, infer I3], readonly [infer P1, infer P2, infer P3]]
      ?
          | FindSelectionUnion<I1, P1, [...Path, 1]>
          | FindSelectionUnion<I2, P2, [...Path, 2]>
          | FindSelectionUnion<I3, P3, [...Path, 3]>
      : [I, P] extends [readonly [infer I1, infer I2], readonly [infer P1, infer P2]]
      ? FindSelectionUnion<I1, P1, [...Path, 1]> | FindSelectionUnion<I2, P2, [...Path, 2]>
      : FindSelectionUnion<II, PP, [...Path, number]> extends infer selectionUnion
      ? {
          [K in keyof selectionUnion]: selectionUnion[K] extends [infer V, infer Path] ? [V[], Path] : never
        }
      : never
    : never
  : IsPlainObject<P> extends true
  ? I extends object
    ? {
        [K in keyof P]: K extends keyof I ? FindSelectionUnion<I[K], P[K], [...Path, K]> : never
      }[keyof P]
    : never
  : never

// SelectionToArgs :: [number | string, value][] -> [...args]
type SelectionToArgs<selections extends Record<string, [unknown, unknown]>, i> = [keyof selections] extends [never]
  ? i
  : typeof $anonymousSelect extends keyof selections
  ? // If the path is never, it means several anonymous patterns were `&` together
    [selections[typeof $anonymousSelect][1]] extends [never]
    ? SeveralAnonymousSelectError
    : keyof selections extends typeof $anonymousSelect
    ? selections[typeof $anonymousSelect][0]
    : MixedNamedAndAnonymousSelectError
  : { [k in keyof selections]: selections[k][0] }

export type FindSelected<I, P> = SelectionToArgs<
  Cast<UnionToIntersection<{} | FindSelectionUnion<I, P>>, Record<string, [unknown, unknown]>>,
  I
>

export type Cast<a, b> = a extends b ? a : never

export type ValueOf<a> = a extends any[] ? a[number] : a[keyof a]

export type Values<a extends object> = UnionToTuple<ValueOf<a>>

type SafeGet<data, k extends PropertyKey, def> = k extends keyof data ? data[k] : def

// Update :: a -> b -> PropertyKey[] -> a
type Update<data, value, path extends PropertyKey[]> = path extends [infer head, ...infer tail]
  ? data extends readonly [any, ...any]
    ? head extends number
      ? [
          ...Slice<data, Iterator<head>>,
          Update<data[head], value, Cast<tail, PropertyKey[]>>,
          ...Drop<data, Next<Iterator<head>>>
        ]
      : never
    : data extends readonly (infer a)[]
    ? Update<a, value, Cast<tail, PropertyKey[]>>[]
    : data extends Set<infer a>
    ? Set<Update<a, value, Cast<tail, PropertyKey[]>>>
    : data extends Map<infer k, infer v>
    ? Map<k, Update<v, value, Cast<tail, PropertyKey[]>>>
    : Compute<
        Omit<data, Cast<head, PropertyKey>> &
          {
            [k in Cast<head, PropertyKey>]: Update<SafeGet<data, k, {}>, value, Cast<tail, PropertyKey[]>>
          }
      >
  : value

export type IsMatching<a, p> =
  // Special case for unknown, because this is the type
  // of the inverted `__` wildcard pattern, which should
  // match everything.
  unknown extends p
    ? true
    : p extends Primitive
    ? p extends a
      ? true
      : false
    : [p, a] extends [readonly any[], readonly any[]]
    ? [p, a] extends [
        readonly [infer p1, infer p2, infer p3, infer p4, infer p5],
        readonly [infer a1, infer a2, infer a3, infer a4, infer a5]
      ]
      ? [IsMatching<a1, p1>, IsMatching<a2, p2>, IsMatching<a3, p3>, IsMatching<a4, p4>, IsMatching<a5, p5>] extends [
          true,
          true,
          true,
          true,
          true
        ]
        ? true
        : false
      : [p, a] extends [
          readonly [infer p1, infer p2, infer p3, infer p4],
          readonly [infer a1, infer a2, infer a3, infer a4]
        ]
      ? [IsMatching<a1, p1>, IsMatching<a2, p2>, IsMatching<a3, p3>, IsMatching<a4, p4>] extends [
          true,
          true,
          true,
          true
        ]
        ? true
        : false
      : [p, a] extends [readonly [infer p1, infer p2, infer p3], readonly [infer a1, infer a2, infer a3]]
      ? [IsMatching<a1, p1>, IsMatching<a2, p2>, IsMatching<a3, p3>] extends [true, true, true]
        ? true
        : false
      : [p, a] extends [readonly [infer p1, infer p2], readonly [infer a1, infer a2]]
      ? [IsMatching<a1, p1>, IsMatching<a2, p2>] extends [true, true]
        ? true
        : false
      : [p, a] extends [readonly [infer p1], readonly [infer a1]]
      ? IsMatching<a1, p1>
      : p extends a
      ? true
      : false
    : IsPlainObject<p> extends true
    ? true extends (
        // `true extends union` means "if some cases of the a union are matching"
        a extends any // loop over the `a` union
          ? [keyof p & keyof a] extends [never] // if no common keys
            ? false
            : /**
             * Intentionally not using ValueOf, to avoid reaching the
             * 'type instantiation is too deep error'.
             */
            { [k in keyof p & keyof a]: IsMatching<a[k], p[k]> }[keyof p & keyof a] extends true
            ? true // all values are matching
            : false
          : never
      )
      ? true
      : false
    : p extends a
    ? true
    : false

export type NonExhaustiveError<I> = { __nonExhaustive: never } & I

/*
 * -------------------------------------------
 * Tuple Operations
 * -------------------------------------------
 */

export type Length<it extends any[]> = it['length']

type Slice<xs extends readonly any[], it extends any[], output extends any[] = []> = Length<it> extends 0
  ? output
  : xs extends readonly [infer head, ...infer tail]
  ? Slice<tail, Prev<it>, [...output, head]>
  : output

type Drop<xs extends readonly any[], n extends any[]> = Length<n> extends 0
  ? xs
  : xs extends readonly [any, ...infer tail]
  ? Drop<tail, Prev<n>>
  : []

type Next<it extends any[]> = [any, ...it]
type Prev<it extends any[]> = it extends readonly [any, ...infer tail] ? tail : []

type Iterator<n extends number, it extends any[] = []> = it['length'] extends n ? it : Iterator<n, [any, ...it]>

/*
 * -------------------------------------------
 * Distribute
 * -------------------------------------------
 */

type BuildMany<data, xs extends any[]> = xs extends any ? BuildOne<data, xs> : never

type BuildOne<data, xs extends any[]> = xs extends [[infer value, infer path], ...infer tail]
  ? BuildOne<Update<data, value, Cast<path, PropertyKey[]>>, tail>
  : data

type DistributeMatchingUnions<a, p> = IsAny<a> extends true ? any : BuildMany<a, Distribute<FindUnionsMany<a, p>>>

type FindUnionsMany<a, p, path extends PropertyKey[] = []> = UnionToTuple<
  (p extends any ? (IsMatching<a, p> extends true ? FindUnions<a, p, path> : []) : never)[number]
>

type FindUnions<a, p, path extends PropertyKey[] = []> = unknown extends p
  ? []
  : IsAny<p> extends true
  ? []
  : Length<path> extends 5
  ? []
  : IsUnion<a> extends true
  ? [
      {
        cases: a extends any
          ? {
              value: a
              subUnions: FindUnionsMany<a, p, path>
            }
          : never
        path: path
      }
    ]
  : [a, p] extends [readonly any[], readonly any[]]
  ? [a, p] extends [
      readonly [infer a1, infer a2, infer a3, infer a4, infer a5],
      readonly [infer p1, infer p2, infer p3, infer p4, infer p5]
    ]
    ? [
        ...FindUnions<a1, p1, [...path, 0]>,
        ...FindUnions<a2, p2, [...path, 1]>,
        ...FindUnions<a3, p3, [...path, 2]>,
        ...FindUnions<a4, p4, [...path, 3]>,
        ...FindUnions<a5, p5, [...path, 4]>
      ]
    : [a, p] extends [
        readonly [infer a1, infer a2, infer a3, infer a4],
        readonly [infer p1, infer p2, infer p3, infer p4]
      ]
    ? [
        ...FindUnions<a1, p1, [...path, 0]>,
        ...FindUnions<a2, p2, [...path, 1]>,
        ...FindUnions<a3, p3, [...path, 2]>,
        ...FindUnions<a4, p4, [...path, 3]>
      ]
    : [a, p] extends [readonly [infer a1, infer a2, infer a3], readonly [infer p1, infer p2, infer p3]]
    ? [...FindUnions<a1, p1, [...path, 0]>, ...FindUnions<a2, p2, [...path, 1]>, ...FindUnions<a3, p3, [...path, 2]>]
    : [a, p] extends [readonly [infer a1, infer a2], readonly [infer p1, infer p2]]
    ? [...FindUnions<a1, p1, [...path, 0]>, ...FindUnions<a2, p2, [...path, 1]>]
    : [a, p] extends [readonly [infer a1], readonly [infer p1]]
    ? FindUnions<a1, p1, [...path, 0]>
    : []
  : a extends Set<any>
  ? []
  : a extends Map<any, any>
  ? []
  : [IsPlainObject<a>, IsPlainObject<p>] extends [true, true]
  ? Flatten<
      Values<
        {
          [k in keyof Required<a> & keyof p]: FindUnions<NonNullable<a[k]>, p[k], [...path, k]>
        }
      >
    >
  : []

type Distribute<unions extends any[]> = unions extends [{ cases: infer cases, path: infer path }, ...infer tail]
  ? cases extends { value: infer value, subUnions: infer subUnions }
    ? [[value, path], ...Distribute<Cast<subUnions, any[]>>, ...Distribute<tail>]
    : never
  : []

type Flatten<xs extends any[]> = xs extends readonly [infer head, ...infer tail]
  ? [...Cast<head, any[]>, ...Flatten<tail>]
  : []

export type IsUnion<a> = [a] extends [UnionToIntersection<a>] ? false : true

export type DeepExclude<a, b> = Exclude<DistributeMatchingUnions<a, b>, b>

export type DeepExcludeAll<a, tuple extends [any, any]> = DeepExclude<
  a,
  tuple extends any ? InvertPatternForExclude<tuple[0], tuple[1]> : never
>

/*
 * -------------------------------------------
 * Util
 * -------------------------------------------
 */

type BuiltInObjects = Function | Error | Date | RegExp | Generator | { readonly [Symbol.toStringTag]: string }

export type IsPlainObject<o> = o extends object ? (o extends BuiltInObjects ? false : true) : false

export type SeveralAnonymousSelectError<
  a = 'You can only use a single anonymous selection (with `select()`) in your pattern. If you need to select multiple values, give them names with `select(<name>)` instead'
> = {
  __error: never
} & a

export type MixedNamedAndAnonymousSelectError<
  a = 'Mixing named selections (`select("name")`) and anonymous selections (`select()`) is forbiden. Please, only use named selections.'
> = {
  __error: never
} & a

export type IsLiteral<T> = T extends null | undefined
  ? true
  : T extends string
  ? string extends T
    ? false
    : true
  : T extends number
  ? number extends T
    ? false
    : true
  : T extends boolean
  ? boolean extends T
    ? false
    : true
  : T extends symbol
  ? symbol extends T
    ? false
    : true
  : T extends bigint
  ? bigint extends T
    ? false
    : true
  : false

export type IsAny<a> = [a] extends [never] ? false : Equal<a, any>

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false

type LeastUpperBound<A, B> = A extends B ? A : B extends A ? B : never

type WithDefault<A, D> = [A] extends [never] ? D : A
