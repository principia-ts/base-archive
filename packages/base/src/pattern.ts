import type {
  AnonymousSelectPattern,
  DeepExcludeAll,
  FindSelected,
  GuardPattern,
  GuardValue,
  InvertPattern,
  MatchedValue,
  NamedSelectPattern,
  NonExhaustiveError,
  NotPattern,
  Pattern
} from './internal/pattern'
import type { Predicate, Refinement } from '@principia/base/Function'

import { identity, pipe } from '@principia/base/Function'

import * as A from './Array'
import { $anonymousSelect, $guard, $namedSelect, $not, matchPattern, selectWithPattern } from './internal/pattern'
import * as O from './Option'

type NonEmptyTuple<A> = readonly [A, ...A[]]

/**
 * Pattern matches on one or more values with the tuple pattern
 * 
 * @category pattern matching
 * @since 1.0.0
 */
export function match_<I extends NonEmptyTuple<any>>(
  ...values: I
): <
  P extends NonEmptyTuple<Pattern<I>>,
  H extends {
    [i in keyof P]: (
      selected: FindSelected<MatchedValue<I, InvertPattern<P[i]>>, P[i]>,
      value: MatchedValue<I, InvertPattern<P[i]>>
    ) => any
  },
  PH extends {
    [i in keyof P]: [P[i], (...args: never) => any]
  }
>(
  ...matchers: PH extends [...any[], any]
    ? {
        [i in keyof P]: [P[i], H[i]]
      }
    : PH
) => DeepExcludeAll<
  I,
  { [K in keyof P]: [P[K], MatchedValue<I, InvertPattern<P[K]>>] }[number]
> extends infer RemainingCases
  ? [RemainingCases] extends [never]
    ? ReturnType<PH[number][1]>
    : NonExhaustiveError<RemainingCases>
  : never {
  return (...matchers) => {
    type Cases = Array<{
      test: (value: I) => boolean
      select: (value: I) => any
      handler: (...args: any) => any
    }>

    return pipe(
      matchers as ReadonlyArray<[Pattern<any>, (...args: any) => any]>,
      A.foldl([] as Cases, (b, [pattern, handler]) => {
        b.push({
          test: (value) => matchPattern(pattern, value),
          handler,
          select: (value) => selectWithPattern(pattern, value)
        })
        return b
      }),
      A.findFirst(({ test }) => test(values)),
      O.match(
        () => {
          let displayedValue
          try {
            displayedValue = JSON.stringify(values)
          } catch (e) {
            displayedValue = values
          }
          throw new Error(`Pattern matching error: no pattern matches value ${displayedValue}`)
        },
        ({ handler, select }) => handler(select(values), values)
      )
    )
  }
}

/**
 * A pipeable version of `match_`. Pattern matches on one or more values with the tuple pattern.
 * 
 * @category pattern matching
 * @since 1.0.0
 */
export function match<
  I extends NonEmptyTuple<any>,
  P extends NonEmptyTuple<Pattern<I>>,
  H extends {
    [i in keyof P]: (
      selected: FindSelected<MatchedValue<I, InvertPattern<P[i]>>, P[i]>,
      value: MatchedValue<I, InvertPattern<P[i]>>
    ) => any
  },
  PH extends {
    [i in keyof P]: [P[i], (...args: never) => any]
  }
>(
  ...matchers: PH extends [...any[], any]
    ? {
        [i in keyof P]: [P[i], H[i]]
      }
    : PH
): (
  values: I
) => DeepExcludeAll<
  I,
  { [K in keyof P]: [P[K], MatchedValue<I, InvertPattern<P[K]>>] }[number]
> extends infer RemainingCases
  ? [RemainingCases] extends [never]
    ? ReturnType<PH[number][1]>
    : NonExhaustiveError<RemainingCases>
  : never {
  return (values) => match_(...values)(...(matchers as any))
}

/**
 * Fluent pattern matching builder type
 */
export interface Matcher<I extends NonEmptyTuple<any>, O, PatternValueTuples extends [any, any] = never> {
  case<P extends Pattern<I>, C, Value = MatchedValue<I, InvertPattern<P>>>(
    pattern: P,
    handler: (selections: FindSelected<Value, P>, value: Value) => C
  ): Matcher<I, O | C, PatternValueTuples | [P, Value]>

  case<
    P1 extends Pattern<I>,
    P2 extends Pattern<I>,
    C,
    P = P1 | P2,
    Value = P extends any ? MatchedValue<I, InvertPattern<P>> : never
  >(
    p1: P1,
    p2: P2,
    handler: (value: Value) => C
  ): Matcher<I, O | C, PatternValueTuples | (P extends any ? [P, Value] : never)>

  case<
    P extends Pattern<I>,
    Pred extends (value: MatchedValue<I, InvertPattern<P>>) => unknown,
    C,
    Value = GuardValue<Pred>
  >(
    pattern: P,
    predicate: Pred,
    handler: (selections: FindSelected<Value, P>, value: Value) => C
  ): Matcher<
    I,
    O | C,
    | PatternValueTuples
    | (Pred extends (value: any) => value is infer Narrowed ? [GuardPattern<unknown, Narrowed>, Value] : never)
  >
  case<
    Ps extends [Pattern<I>, ...Pattern<I>[]],
    C,
    P = Ps[number],
    Value = P extends any ? MatchedValue<I, InvertPattern<P>> : never
  >(
    ...args: [...patterns: Ps, handler: (value: Value) => C]
  ): Matcher<I, O | C, PatternValueTuples | (P extends any ? [P, Value] : never)>

  if<Pred extends (value: I) => unknown, C, Value = GuardValue<Pred>>(
    predicate: Pred,
    handler: (value: Value) => C
  ): Matcher<
    I,
    O | C,
    | PatternValueTuples
    | (Pred extends (value: any) => value is infer Narrowed ? [GuardPattern<unknown, Narrowed>, Value] : never)
  >

  otherwise<C>(handler: (value: I) => C): O | C

  exhaustive: DeepExcludeAll<I, PatternValueTuples> extends infer RemainingCases
    ? [RemainingCases] extends [never]
      ? () => O
      : NonExhaustiveError<RemainingCases>
    : never

  run(): O
}

/**
 * Use a Predicate or Refinement as a pattern
 * 
 * @category pattern matching
 * @since 1.0.0
 */
export function when<A, B extends A>(refinement: Refinement<A, B>): GuardPattern<A, B>
export function when<A>(predicate: Predicate<A>): GuardPattern<A, A>
export function when<A>(predicate: Predicate<A>): GuardPattern<A, A> {
  return {
    '@@pattern/__patternKind': $guard,
    '@@pattern/__when': predicate
  }
}

/**
 * Invert a pattern
 * 
 * @category pattern matching
 * @since 1.0.0
 */
export function not<A>(pattern: Pattern<A>): NotPattern<A> {
  return {
    '@@pattern/__patternKind': $not,
    '@@pattern/__pattern': pattern
  }
}

/**
 * Select a value to be provided to the pattern handler
 * 
 * @category pattern matching
 * @since 1.0.0
 */
export function select(): AnonymousSelectPattern
export function select<K extends string>(key: K): NamedSelectPattern<K>
export function select<K extends string>(key?: K): AnonymousSelectPattern | NamedSelectPattern<K> {
  return key === undefined
    ? {
        '@@pattern/__patternKind': $anonymousSelect
      }
    : {
        '@@pattern/__patternKind': $namedSelect,
        '@@pattern/__key': key
      }
}

/**
 * Returns a pattern matcher that uses the fluent api pattern
 */
export function pmatch<A extends NonEmptyTuple<any>>(...values: A): Matcher<A, never> {
  return builder(values, []) as any
}

function builder<A extends NonEmptyTuple<any>, B>(
  value: A,
  cases: {
    test: (value: A) => unknown
    select: (value: A) => any
    handler: (...args: any) => any
  }[]
): Matcher<A, B> {
  const run = () => {
    const entry = cases.find(({ test }) => test(value))
    if (!entry) {
      let displayedValue
      try {
        displayedValue = JSON.stringify(value)
      } catch (e) {
        displayedValue = value
      }
      throw new Error(`Pattern matching error: no pattern matches value ${displayedValue}`)
    }
    return entry.handler(entry.select(value), value)
  }

  return {
    case(...args: ReadonlyArray<any>) {
      const { patterns, predicates } = pipe(
        args.slice(0, -1),
        A.foldl({ patterns: [] as Array<Pattern<A>>, predicates: [] as Array<Predicate<A>> }, (acc, arg) => {
          if (typeof arg === 'function') {
            acc.predicates.push(arg)
          } else {
            acc.patterns.push(arg)
          }
          return acc
        })
      )
      const handler                  = args[args.length - 1]

      const doesMatch = (value: A) =>
        Boolean(
          patterns.some((pattern) => matchPattern(pattern, value)) &&
            predicates.every((predicate) => predicate(value as any))
        )

      return builder(
        value,
        cases.concat([
          {
            test: doesMatch,
            handler,
            select: (value) => (patterns.length === 1 ? selectWithPattern(patterns[0], value) : value)
          }
        ])
      ) as any
    },

    if: (predicate, handler) =>
      builder(
        value,
        cases.concat([
          {
            test: predicate,
            handler,
            select: identity
          }
        ])
      ) as any,

    otherwise: <C>(handler: (value: A) => C): B | C =>
      builder<A, B | C>(
        value,
        cases.concat([
          {
            test: () => true,
            handler,
            select: identity
          }
        ])
      ).run(),

    exhaustive: (() => run()) as any,

    run
  }
}

export { __ } from './internal/pattern'
