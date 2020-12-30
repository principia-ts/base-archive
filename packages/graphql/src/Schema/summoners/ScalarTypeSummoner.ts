import type { _I, _O, ScalarConfig, ScalarFunctions, ScalarParseLiteralF } from '../Scalar'
import type { UnionToIntersection } from '@principia/base/util/types'
import type { ValueNode } from 'graphql'

import { flow, pipe } from '@principia/base/data/Function'
import * as DE from '@principia/codec/DecodeErrors'
import * as Sy from '@principia/io/Sync'
import * as M from '@principia/model'
import { valueFromASTUntyped } from 'graphql'

import { createScalarTypeDefinitionNode } from '../AST'
import { GraphQlException } from '../GraphQlException'
import { GQLScalar } from '../Types'

export interface ScalarTypeSummoner {
  <Name extends string, Funcs extends ScalarFunctions<any, any>>(
    name: Name,
    definition: Funcs,
    config?: ScalarConfig
  ): GQLScalar<
    Name,
    UnionToIntersection<
      {
        [K in keyof Funcs]: Funcs[K] extends (...args: any[]) => any
          ? [ReturnType<Funcs[K]>] extends [Sy.Sync<infer R, any, any>]
            ? R
            : unknown
          : unknown
      }[keyof Funcs]
    >,
    _I<Funcs>,
    _O<Funcs>
  >
}

export interface ScalarTypeFromModelSummoner {
  <Name extends string, Config extends ScalarTypeFromCodecConfig<I, O>, I, O>(
    name: Name,
    model: M.M<{}, I, O>,
    config?: Config
  ): GQLScalar<
    Name,
    {
      parseLiteral: undefined extends Config['parseLiteral']
        ? (u: ValueNode) => Sy.Sync<unknown, GraphQlException, I>
        : NonNullable<Config['parseLiteral']>
      parseValue: (u: unknown) => Sy.Sync<unknown, GraphQlException, I>
      serialize: (u: unknown) => Sy.Sync<unknown, GraphQlException, O>
    },
    I,
    O
  >
}

export const makeScalarTypeSummoner: ScalarTypeSummoner = (name, definition, config) =>
  new GQLScalar(
    createScalarTypeDefinitionNode({
      description: config?.description,
      directives: config?.directives,
      name
    }),
    name,
    definition
  )

interface ScalarTypeFromCodecConfig<E, A> extends ScalarConfig {
  message?: string
  parseLiteral?: ScalarParseLiteralF<unknown, E>
}

const SyM = DE.getDecodeErrorsValidation({ ...Sy.MonadFail, ...Sy.Bifunctor, ...Sy.Fallible })

export const makeScalarTypeFromCodecSummoner: ScalarTypeFromModelSummoner = (name, model, config) => {
  const { decode } = M.getDecoder(model)(SyM)
  const { encode } = M.getEncoder(model)
  const serialize = (u: unknown) =>
    pipe(
      decode(u),
      Sy.mapError(
        (errors) =>
          new GraphQlException(config?.message ?? `Invalid value ${u} provided to Scalar ${name}`, 400, {
            errors: DE.draw(errors)
          })
      )
    )
  const parseValue = flow(serialize, Sy.map(encode))
  const parseLiteral = (valueNode: ValueNode) =>
    pipe(
      valueNode,
      valueFromASTUntyped,
      decode,
      Sy.bimap(
        (errors) =>
          new GraphQlException(
            config?.message ?? `Invalid value ${valueFromASTUntyped(valueNode)} provided to Scalar ${name}`,
            400,
            { errors: DE.draw(errors) }
          ),
        encode
      )
    )
  return new GQLScalar(
    createScalarTypeDefinitionNode({
      description: config?.description,
      directives: config?.directives,
      name
    }),
    name,
    {
      parseLiteral: config?.parseLiteral ?? (parseLiteral as any),
      parseValue,
      serialize
    }
  )
}
