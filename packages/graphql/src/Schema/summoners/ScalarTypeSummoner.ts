import * as DE from "@principia/core/DecodeError";
import { flow, pipe } from "@principia/core/Function";
import { SerializableError } from "@principia/core/SerializableError";
import * as Sy from "@principia/core/Sync";
import * as M from "@principia/model";
import type { ValueNode } from "graphql";
import { valueFromASTUntyped } from "graphql";

import { createScalarTypeDefinitionNode } from "../AST";
import type { ScalarTypeConfig } from "../containers";
import { ScalarType } from "../containers";
import type { ScalarA, ScalarE, ScalarFunctions, ScalarParseLiteralF } from "../Scalar";

export interface ScalarTypeSummoner<URI extends string> {
  <Name extends string, Funcs extends ScalarFunctions<any, any>>(
    name: Name,
    definition: Funcs,
    config?: ScalarTypeConfig
  ): ScalarType<URI, Name, Funcs, ScalarE<Funcs>, ScalarA<Funcs>>;
}

export interface ScalarTypeFromModelSummoner<URI extends string> {
  <Name extends string, Config extends ScalarTypeFromCodecConfig<E, A> & ScalarTypeConfig, E, A>(
    name: Name,
    model: M.M<{}, E, A>,
    config?: Config
  ): ScalarType<
    URI,
    Name,
    {
      parseLiteral: undefined extends Config["parseLiteral"]
        ? (u: ValueNode) => Sy.Sync<unknown, SerializableError<{ errors: string }>, E>
        : NonNullable<Config["parseLiteral"]>;
      parseValue: (u: unknown) => Sy.Sync<unknown, SerializableError<{}>, E>;
      serialize: (u: unknown) => Sy.Sync<unknown, SerializableError<{}>, A>;
    },
    E,
    A
  >;
}

export function makeScalarTypeSummoner<URI extends string>(): ScalarTypeSummoner<URI> {
  return (name, definition, config) => {
    return new ScalarType(
      name,
      createScalarTypeDefinitionNode({
        description: config?.description,
        directives: config?.directives,
        name
      }),
      definition
    );
  };
}

interface ScalarTypeFromCodecConfig<E, A> {
  errorCode?: string;
  message?: string;
  parseLiteral?: ScalarParseLiteralF<unknown, E>;
  userMessage?: string;
}

export function makeScalarTypeFromCodecSummoner<
  URI extends string
>(): ScalarTypeFromModelSummoner<URI> {
  return (name, model, config) => {
    const { decode } = M.getDecoder(model)(DE.SyncDecoderF);
    const { encode } = M.getEncoder(model);
    const serialize = (u: unknown) =>
      pipe(
        decode(u),
        Sy.mapError(
          (errors) =>
            new SerializableError<{ errors: string }>(
              config?.errorCode ?? "INVALID_SCALAR_VALUE",
              config?.message ?? `Invalid value ${u} provided to Scalar ${name}`,
              "TODO: id",
              { errors: DE.draw(errors) },
              serialize,
              config?.userMessage ?? `Invalid value ${u} provided to Scalar ${name}`
            )
        )
      );
    const parseValue = flow(serialize, Sy.map(encode));
    const parseLiteral = (valueNode: ValueNode) =>
      pipe(
        valueNode,
        valueFromASTUntyped,
        decode,
        Sy.bimap(
          (errors) =>
            new SerializableError<{ errors: string }>(
              config?.errorCode ?? "INVALID_SCALAR_VALUE",
              config?.message ??
                `Invalid value ${valueFromASTUntyped(valueNode)} provided to Scalar ${name}`,
              "TODO: id",
              { errors: DE.draw(errors) },
              parseLiteral,
              config?.userMessage ??
                `Invalid value ${valueFromASTUntyped(valueNode)} provided to Scalar ${name}`
            ),
          encode
        )
      );
    return new ScalarType(
      name,
      createScalarTypeDefinitionNode({
        description: config?.description,
        directives: config?.directives,
        name
      }),
      {
        parseLiteral: config?.parseLiteral ?? (parseLiteral as any),
        parseValue,
        serialize
      }
    );
  };
}
