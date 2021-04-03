import type { DecodeError } from './DecodeError'
import type { Guard } from '@principia/base/Guard'
import type { Refinement } from '@principia/base/Refinement'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/boolean'
import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import * as N from '@principia/base/number'
import * as R from '@principia/base/Record'
import * as Str from '@principia/base/string'
import { inspect } from 'util'

import { BooleanE, KeyE, NumberE, ParseE, StringE, StructE } from './DecodeError'

export interface Decoder<I, E, A> {
  readonly _I?: (_: I) => void
  readonly _E?: () => E
  readonly _A?: () => A

  readonly label: string
  readonly decode: (i: I) => E.Either<DecodeError<E>, A>
}

export type UDecoder<E, A> = Decoder<unknown, E, A>

export type InputOf<D> = D extends Decoder<infer I, any, any> ? I : never
export type ErrorOf<D> = D extends Decoder<any, infer E, any> ? E : never
export type TypeOf<D> = D extends Decoder<any, any, infer A> ? A : never

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export interface FromParseD<I, E, A> extends Decoder<I, E, A> {
  readonly _tag: 'FromParseD'
  readonly parser: Decoder<I, E, A>['decode']
}

export function fromParse<I, E, A>(label: string, parser: (i: I) => E.Either<E, A>): FromParseD<I, E, A> {
  return {
    _tag: 'FromParseD',
    label,
    parser,
    decode: (i) =>
      pipe(
        parser(i),
        E.mapLeft((e) => new ParseE(i, e))
      )
  }
}

export interface FromRefinementD<I, E, A extends I> extends Decoder<I, E, A> {
  readonly _tag: 'FromRefinementD'
  readonly refinement: Refinement<I, A>
  readonly onError: (i: I) => E
}

export function fromRefinement<I, E, A extends I>(
  label: string,
  refinement: Refinement<I, A>,
  onError: (i: I) => E
): FromRefinementD<I, E, A> {
  return {
    _tag: 'FromRefinementD',
    label,
    refinement,
    onError,
    decode: (i) => (refinement(i) ? E.Right(i) : E.Left(onError(i)))
  }
}

export function fromGuard<I, E, A extends I>(
  label: string,
  guard: Guard<I, A>,
  onError: (i: I) => E
): FromRefinementD<I, E, A> {
  return fromRefinement(label, guard.is, onError)
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export interface stringUD extends Decoder<unknown, StringE, string> {
  readonly _tag: 'stringUD'
}

export const string: stringUD = {
  _tag: 'stringUD',
  label: 'string',
  decode: fromGuard('string', Str.Guard, (i) => new StringE(i)).decode
}

export interface numberUD extends Decoder<unknown, NumberE, number> {
  readonly _tag: 'numberUD'
}

export const number: numberUD = {
  _tag: 'numberUD',
  label: 'number',
  decode: fromGuard('number', N.Guard, (i) => new NumberE(i)).decode
}

export interface booleanUD extends Decoder<unknown, BooleanE, boolean> {
  readonly _tag: 'booleanUD'
}

export const boolean: booleanUD = {
  _tag: 'booleanUD',
  label: 'boolean',
  decode: fromGuard('boolean', B.Guard, (i) => new BooleanE(i)).decode
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export interface ParseD<From extends Decoder<any, any, any>, E, B>
  extends Decoder<InputOf<From>, ErrorOf<From> | E, B> {
  readonly _tag: 'ParseD'
  readonly from: From
  readonly parser: Decoder<TypeOf<From>, E, B>['decode']
}

export function parse_<From extends Decoder<any, any, any>, E, B>(
  from: From,
  label: string,
  parser: (i: TypeOf<From>) => E.Either<E, B>
): ParseD<From, E, B> {
  return {
    _tag: 'ParseD',
    from,
    label,
    parser: parser as any,
    decode: (i) =>
      pipe(
        from.decode(i),
        E.bind(
          flow(
            parser,
            E.mapLeft((e) => new ParseE(i, e))
          )
        )
      )
  }
}

export function parse<From extends Decoder<any, any, any>, E, B>(
  name: string,
  parser: (i: TypeOf<From>) => E.Either<E, B>
): (from: From) => ParseD<From, E, B> {
  return (from) => parse_(from, name, parser)
}

export interface ComposeD<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>
  extends Decoder<InputOf<From>, ErrorOf<From> | ErrorOf<To>, TypeOf<To>> {
  readonly _tag: 'ComposeD'
  readonly from: From
  readonly to: To
}

export function compose_<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  from: From,
  to: To
): ComposeD<From, To> {
  return {
    _tag: 'ComposeD',
    label: `${from.label} >>> ${to.label}`,
    from,
    to,
    decode: flow(from.decode, E.bind(to.decode))
  }
}

export function compose<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  ab: To
): (ia: From) => ComposeD<From, To> {
  return (ia) => compose_(ia, ab)
}

export interface FromStructD<P extends Record<string, Decoder<any, any, any>>>
  extends Decoder<{ [K in keyof P]: InputOf<P[K]> }, ErrorOf<P[keyof P]>, { [K in keyof P]: TypeOf<P[K]> }> {
  readonly _tag: 'FromStructD'
  readonly properties: P
}

export function fromStruct<P extends Record<string, Decoder<any, any, any>>>(properties: P): FromStructD<P> {
  const label = `{ ${pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`

  return {
    _tag: 'FromStructD',
    properties,
    label,
    decode: (i) => {
      const errors: Array<KeyE<any>>   = []
      const mut_r: Record<string, any> = {}
      for (const key in properties) {
        const r = properties[key].decode(i[key])
        E.match_(
          r,
          (e) => {
            errors.push(new KeyE(i[key], key, e))
          },
          (a) => {
            mut_r[key] = a
          }
        )
      }
      return A.isNonEmpty(errors) ? E.Left(new StructE(i, errors)) : E.Right(mut_r as { [K in keyof P]: TypeOf<P[K]> })
    }
  }
}

const d = fromStruct({
  a: string,
  b: number,
  c: boolean
})

console.log(d.label)

console.log(inspect(d.decode({ a: 42, b: 'not number', c: 0 }), { depth: 10 }))
