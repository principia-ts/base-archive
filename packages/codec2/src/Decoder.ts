import type { DecodeError } from './DecodeError'
import type { MonadDecoder } from './MonadDecoder'
import type { Guard } from '@principia/base/Guard'
import type * as HKT from '@principia/base/HKT'
import type { Refinement } from '@principia/base/Refinement'

import { flow, pipe } from '@principia/base/function'
import * as Str from '@principia/base/string'

import { ParseE, RefineE, StringE } from './DecodeError'

export class Decoder<I, E, A> {
  readonly _I!: (_: I) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(
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
  ) {}
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

export class FromParseD<I, E, A> extends Decoder<I, E, A> {
  constructor(readonly name: string, readonly parser: Decoder<I, E, A>['decode']) {
    super((M) => {
      const d = parser(M)
      return (i) =>
        pipe(
          d(i),
          M.mapLeft((e) => new ParseE(i, e))
        )
    })
  }
}

export function fromParse<I, E, A>(
  name: string,
  decode: (M: MonadDecoder<HKT.UHKT2<unknown>, HKT.V<'E', '+'>>) => (i: I) => HKT.HKT2<unknown, E, A>
): FromParseD<I, E, A> {
  return new FromParseD(name, decode as any)
}

export class FromRefinementD<I, E, A extends I> extends Decoder<I, E, A> {
  constructor(readonly name: string, readonly refinement: Refinement<I, A>, readonly onError: (i: I) => E) {
    super((M) => (i) => (refinement(i) ? M.pure(i) : M.fail(new RefineE(i, onError(i)) as any)))
  }
}

export function fromRefinement<I, E, A extends I>(
  name: string,
  refinement: Refinement<I, A>,
  onError: (i: I) => E
): FromRefinementD<I, E, A> {
  return new FromRefinementD(name, refinement, onError)
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

export const string = fromGuard('string', Str.Guard, (i) => new StringE(i))

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export class ParseD<From extends Decoder<any, any, any>, E, B> extends Decoder<InputOf<From>, ErrorOf<From> | E, B> {
  constructor(readonly name: string, readonly from: From, readonly parser: Decoder<TypeOf<From>, E, B>['decode']) {
    super((M) => {
      const decodeFrom = from.decode(M)
      const parse      = parser(M)
      return (i) =>
        pipe(
          decodeFrom(i),
          M.bind(
            flow(
              parse,
              M.mapLeft((e) => new ParseE(i, e))
            )
          )
        )
    })
  }
}

export function parse_<From extends Decoder<any, any, any>, E, B>(
  from: From,
  name: string,
  parser: (M: MonadDecoder<HKT.UHKT2<unknown>, HKT.V<'E', '+'>>) => (i: TypeOf<From>) => HKT.HKT2<unknown, E, B>
): ParseD<From, E, B> {
  return new ParseD(name, from, parser as any)
}

export function parse<From extends Decoder<any, any, any>, E, B>(
  name: string,
  parser: (M: MonadDecoder<HKT.UHKT2<unknown>, HKT.V<'E', '+'>>) => (i: TypeOf<From>) => HKT.HKT2<unknown, E, B>
): (from: From) => ParseD<From, E, B> {
  return (from) => parse_(from, name, parser)
}

export function compose_<I, E, A, E1, B>(
  ia: Decoder<I, E, A>,
  ab: Decoder<A, E1, B>
): unknown extends I ? UDecoder<E | E1, B> : Decoder<I, E | E1, B> {
  return new Decoder((M) => {
    const decodeIA = ia.decode(M)
    const decodeAB = ab.decode(M)
    return flow(decodeIA, M.bind(decodeAB))
  }) as any
}

export function compose<A, E1, B>(
  ab: Decoder<A, E1, B>
): <I, E>(ia: Decoder<I, E, A>) => unknown extends I ? UDecoder<E | E1, B> : Decoder<I, E | E1, B> {
  return (ia) => compose_(ia, ab)
}
