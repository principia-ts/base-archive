import type {
  AnyExtendObjectType,
  AnyInputObjectType,
  AnyObjectType,
  AnyRootTypes,
  AnyScalarType,
  ExtendObjectType,
  FieldRecord,
  ObjectType,
  ScalarType
} from "./containers";
import type { Compute } from "@principia/base/util/compute";
import type { UnionToIntersection } from "@principia/base/util/types";
import type {
  DocumentNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode
} from "graphql";

import { foldLeftWithIndex_ as reduceRecord } from "@principia/base/data/Record";

import { createDocumentNode, createSchemaDefinitionNode } from "./AST";

export type AllResolvers<
  URI extends string,
  Ctx,
  Types extends ReadonlyArray<AnyRootTypes<URI, Ctx>>
> = Compute<
  UnionToIntersection<
    {
      [k in keyof Types]: Types[k] extends ObjectType<
        infer URI,
        infer Name,
        infer Root,
        Ctx,
        infer FieldResolvers,
        infer Res,
        infer R,
        infer A
      >
        ? URI extends URI
          ? {
              [k in Name]: Res;
            }
          : never
        : Types[k] extends ExtendObjectType<
            infer URI,
            infer Root,
            Ctx,
            infer Type,
            infer Fields,
            infer Res,
            infer A
          >
        ? URI extends URI
          ? { [k in Type["name"]]: Res }
          : never
        : never;
    }[keyof Types & number]
  >
>;

export type AllScalarDefinitions<
  URI extends string,
  Types extends ReadonlyArray<AnyRootTypes<URI, any>>
> = Compute<
  UnionToIntersection<
    {
      [k in keyof Types]: Types[k] extends ScalarType<
        infer URI,
        infer Name,
        infer Funcs,
        infer E,
        infer A
      >
        ? URI extends URI
          ? {
              [k in Name]: {
                functions: Funcs;
                name: Name;
              };
            }
          : never
        : never;
    }[keyof Types & number]
  >
>;

export interface SchemaParts<
  URI extends string,
  Ctx,
  Types extends ReadonlyArray<AnyRootTypes<URI, Ctx>>
> {
  resolvers: AllResolvers<URI, Ctx, Types>;
  scalars: AllScalarDefinitions<URI, Types>;
  typeDefs: DocumentNode;
}

export interface SchemaGenerator<URI extends string, Ctx> {
  <
    Types extends [
      ObjectType<URI, "Query", {}, Ctx, FieldRecord<URI, {}, Ctx, any>, any, any, any>,
      ...AnyRootTypes<URI, Ctx>[]
    ]
  >(
    ...types: [...Types]
  ): SchemaParts<URI, Ctx, Types>;
}

export const makeSchemaGenerator = <URI extends string, Ctx>(): SchemaGenerator<URI, Ctx> => (
  ...types
) => {
  const objectTypes: Record<string, AnyObjectType<URI, Ctx>> = {};
  const extendTypes: Record<string, AnyExtendObjectType<URI, Ctx>> = {};
  const inputObjectTypes: Record<string, AnyInputObjectType<URI>> = {};
  const scalarTypes: Record<string, AnyScalarType<URI>> = {};
  for (const type of types) {
    switch (type._tag) {
      case "ExtendObjectType": {
        extendTypes[(type as AnyExtendObjectType<URI, Ctx>).type.name] = type as any;
        break;
      }
      case "ObjectType": {
        objectTypes[(type as AnyObjectType<URI, Ctx>).name] = type as any;
        break;
      }
      case "InputObjectType": {
        inputObjectTypes[(type as AnyInputObjectType<URI>).name] = type as any;
        break;
      }
      case "ScalarType": {
        scalarTypes[(type as AnyScalarType<URI>).name] = type as any;
      }
    }
  }
  const resolvers: any = {};
  for (const [k, v] of Object.entries(objectTypes)) {
    resolvers[k] = v.fieldResolvers;
  }
  for (const [k, v] of Object.entries(extendTypes)) {
    if (resolvers[k]) {
      resolvers[k] = { ...resolvers[k], ...v.fieldResolvers };
    } else {
      resolvers[k] = v.fieldResolvers;
    }
  }
  const scalars: any = {};
  for (const [k, v] of Object.entries(scalarTypes)) {
    scalars[k] = {
      functions: v.functions,
      name: v.name
    };
  }
  const extendFieldASTs = reduceRecord(
    extendTypes,
    {} as Record<string, FieldDefinitionNode[]>,
    (k, acc, v) => ({
      ...acc,
      [k]: v.fields
    })
  );
  const extendObjectNames = reduceRecord(extendTypes, [] as string[], (k, acc, _v) => [...acc, k]);
  const objectASTs = reduceRecord(objectTypes, [] as ObjectTypeDefinitionNode[], (k, acc, v) => {
    return extendObjectNames.includes(k)
      ? [...acc, { ...v.node, fields: [...(v.node.fields || []), ...extendFieldASTs[k]] }]
      : [...acc, v.node];
  });
  const inputASTs = reduceRecord(
    inputObjectTypes,
    [] as InputObjectTypeDefinitionNode[],
    (k, acc, v) => [...acc, v.node]
  );
  const scalarASTs = reduceRecord(scalarTypes, [] as ScalarTypeDefinitionNode[], (k, acc, v) => [
    ...acc,
    v.node
  ]);
  const schemaDefinitionNode = createSchemaDefinitionNode({
    mutation: Object.keys(resolvers).includes("Mutation"),
    query: Object.keys(resolvers).includes("Query")
  });
  const typeDefs = createDocumentNode([
    ...objectASTs,
    ...inputASTs,
    ...scalarASTs,
    schemaDefinitionNode
  ]);
  return { resolvers, scalars, typeDefs };
};
