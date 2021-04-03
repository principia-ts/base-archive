import type { DecodeError } from './DecodeError'
import type { MonadDecoder } from './MonadDecoder'
import type { Guard } from '@principia/base/Guard'
import type * as HKT from '@principia/base/HKT'
import type { Refinement } from '@principia/base/Refinement'

import * as B from '@principia/base/boolean'
import * as E from '@principia/base/Either'
import { constVoid, flow, identity, pipe } from '@principia/base/function'
import * as N from '@principia/base/number'
import * as R from '@principia/base/Record'
import * as Str from '@principia/base/string'
import * as Sy from '@principia/io/Sync'
import { inspect } from 'util'

import { BooleanE, KeyE, NumberE, ParseE, RefineE, StringE, StructE } from './DecodeError'

export interface Decoder<I, E, A> {
  readonly _I?: (_: I) => void
  readonly _E?: () => E
  readonly _A?: () => A

  readonly decode: <M extends HKT.URIS, C extends HKT.V<'E', '+'>>(
    M: MonadDecoder<M, C>
  ) => (
    i: I
  ) => HKT.Kind<
    M,
    C,
    HKT.Initial<C, 'N'>,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    DecodeError<E>,
    A
  >
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
  readonly name: string
  readonly parser: Decoder<I, E, A>['decode']
}

export function fromParse<I, E, A>(
  name: string,
  parser: (M: MonadDecoder<HKT.UHKT2<unknown>, HKT.V<'E', '+'>>) => (i: I) => HKT.HKT2<unknown, E, A>
): FromParseD<I, E, A> {
  return {
    _tag: 'FromParseD',
    name,
    parser: parser as any,
    decode: (M) => {
      const d = parser(M as any)
      return (i) => pipe(d(i), M.mapLeft((e) => new ParseE(i, e)) as any)
    }
  }
}

export interface FromRefinementD<I, E, A extends I> extends Decoder<I, E, A> {
  readonly _tag: 'FromRefinementD'
  readonly refinement: Refinement<I, A>
  readonly onError: (i: I) => E
}

export function fromRefinement<I, E, A extends I>(
  name: string,
  refinement: Refinement<I, A>,
  onError: (i: I) => E
): FromRefinementD<I, E, A> {
  return {
    _tag: 'FromRefinementD',
    refinement,
    onError,
    decode: (M) => (i) => (refinement(i) ? M.pure(i) : M.fail(onError(i) as any))
  }
}

export function fromGuard<I, E, A extends I>(
  name: string,
  guard: Guard<I, A>,
  onError: (i: I) => E
): FromRefinementD<I, E, A> {
  return fromRefinement(name, guard.is, onError)
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
  decode: fromGuard('string', Str.Guard, (i) => new StringE(i)).decode
}

export interface numberUD extends Decoder<unknown, NumberE, number> {
  readonly _tag: 'numberUD'
}

export const number: numberUD = {
  _tag: 'numberUD',
  decode: fromGuard('number', N.Guard, (i) => new NumberE(i)).decode
}

export interface booleanUD extends Decoder<unknown, BooleanE, boolean> {
  readonly _tag: 'booleanUD'
}

export const boolean: booleanUD = {
  _tag: 'booleanUD',
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
  readonly name: string
  readonly from: From
  readonly parser: Decoder<TypeOf<From>, E, B>['decode']
}

export function parse_<From extends Decoder<any, any, any>, E, B>(
  from: From,
  name: string,
  parser: (M: MonadDecoder<HKT.UHKT2<unknown>, HKT.V<'E', '+'>>) => (i: TypeOf<From>) => HKT.HKT2<unknown, E, B>
): ParseD<From, E, B> {
  return {
    _tag: 'ParseD',
    from,
    name,
    parser: parser as any,
    decode: (M) => {
      const decodeFrom = from.decode(M)
      const parse      = parser(M as any)
      return (i: InputOf<From>) => pipe(decodeFrom(i), M.bind(flow(parse, M.mapLeft((e) => new ParseE(i, e)) as any)))
    }
  }
}

export function parse<From extends Decoder<any, any, any>, E, B>(
  name: string,
  parser: (M: MonadDecoder<HKT.UHKT2<unknown>, HKT.V<'E', '+'>>) => (i: TypeOf<From>) => HKT.HKT2<unknown, E, B>
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
    from,
    to,
    decode: (M) => {
      const decodeIA = from.decode(M)
      const decodeAB = to.decode(M)
      return flow(decodeIA, M.bind(decodeAB))
    }
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
  return {
    _tag: 'FromStructD',
    properties,
    decode: (M) => {
      const itraverse = R.itraverse(M)
      const decoders  = R.map_(properties, (d) => d.decode(M))
      return (i) => {
        const errors: Array<any> = []
        const mut_r              = {}
        return pipe(
          decoders,
          itraverse((key, decoder) =>
            pipe(
              decoder(i[key]),
              M.attempt,
              M.tap((result) => {
                E.match_(
                  result,
                  (e) => {
                    errors.push(new KeyE(i[key], key, e))
                  },
                  (a) => {
                    mut_r[key] = a
                  }
                )
                return M.pure(result)
              })
            )
          ),
          M.bind((_) => (errors.length !== 0 ? M.fail(new StructE(i, errors as any) as any) : M.pure(mut_r)))
        )
      }
    }
  }
}
