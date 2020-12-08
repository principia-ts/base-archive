import type { Compute, ExcludeMatchingProperties } from "@principia/prelude/Utils";

import type { InputTypeConfig, OutputTypeConfig } from "../Config";
import type { AnyExtendObjectType } from "./ExtendObjectType";
import type { AnyFieldType, FieldType } from "./FieldType";
import type { AnyInputObjectType } from "./InputObjectType";
import type { InputObjectValueType } from "./InputObjectValueType";
import type { InputValueType } from "./InputValueType";
import type { AnyObjectFieldType, ObjectFieldType } from "./ObjectFieldType";
import type { AnyObjectType } from "./ObjectType";
import type { RecursiveType } from "./RecursiveObjectType";
import type { AnyScalarFieldType, ScalarFieldType } from "./ScalarFieldType";
import type { AnyScalarType } from "./ScalarType";

export type AnyField<ApolloURI extends string, Ctx> =
  | AnyScalarFieldType<ApolloURI>
  | AnyObjectFieldType<ApolloURI, Ctx>;

export type AnyOutputType<ApolloURI extends string, Ctx> =
  | AnyScalarFieldType<ApolloURI>
  | AnyObjectType<ApolloURI, any>
  | AnyFieldType<ApolloURI, any>
  | RecursiveType<ApolloURI, OutputTypeConfig, any, any>
  | AnyObjectFieldType<ApolloURI, Ctx>;

export type AnyOutputFieldType<ApolloURI extends string, Ctx> =
  | AnyScalarFieldType<ApolloURI>
  | AnyFieldType<ApolloURI, Ctx>
  | RecursiveType<ApolloURI, OutputTypeConfig, any, any>
  | AnyObjectFieldType<ApolloURI, Ctx>;

export type AnyRootTypes<ApolloURI extends string, Ctx> =
  | AnyInputObjectType<ApolloURI>
  | AnyObjectType<ApolloURI, Ctx>
  | AnyExtendObjectType<ApolloURI, Ctx>
  | AnyScalarType<ApolloURI>;

export type FieldRecord<ApolloURI extends string, Root, Ctx, Fields> = Partial<
  {
    [k in keyof Root]: Root[k] extends Iterable<infer T>
      ?
          | ScalarFieldType<ApolloURI, OutputTypeConfig, Root[k]>
          | FieldType<
              ApolloURI,
              OutputTypeConfig,
              AnyField<ApolloURI, Ctx>,
              Root,
              any,
              any,
              any,
              any
            >
      : Root[k] extends { [x: string]: any }
      ?
          | ObjectFieldType<
              ApolloURI,
              OutputTypeConfig,
              Root[k],
              Ctx,
              any,
              { [k1 in keyof Root[k]]: Root[k][k1] }
            >
          | FieldType<
              ApolloURI,
              OutputTypeConfig,
              AnyField<ApolloURI, Ctx>,
              Root,
              any,
              Ctx,
              any,
              any
            >
      :
          | ScalarFieldType<ApolloURI, OutputTypeConfig, Root[k]>
          | FieldType<
              ApolloURI,
              OutputTypeConfig,
              AnyField<ApolloURI, Ctx>,
              Root,
              any,
              Ctx,
              any,
              any
            >
          | RecursiveType<ApolloURI, OutputTypeConfig, any, any>
          | ObjectFieldType<ApolloURI, OutputTypeConfig, Ctx, any, any, any>;
  }
> &
  {
    [k in Exclude<keyof Fields, keyof Root>]:
      | FieldType<ApolloURI, OutputTypeConfig, any, Root, any, any, any, any>
      | ScalarFieldType<ApolloURI, OutputTypeConfig, any>
      | RecursiveType<ApolloURI, OutputTypeConfig, any, any>
      | ObjectFieldType<ApolloURI, OutputTypeConfig, any, Ctx, AnyObjectType<ApolloURI, Ctx>, any>;
  };

export type FieldResolverRecord<
  ApolloURI extends string,
  Fields extends FieldRecord<any, any, any, Fields>
> = Compute<
  ExcludeMatchingProperties<
    {
      [k in keyof Fields]: Fields[k] extends FieldType<
        any,
        any,
        any,
        any,
        infer Args,
        any,
        infer Res,
        any
      >
        ? Res
        : never;
    },
    never
  >
>;

export type InputRecord<ApolloURI extends string, Args> = {
  [k in keyof Args]:
    | InputValueType<ApolloURI, InputTypeConfig<any>, any>
    | InputObjectValueType<ApolloURI, InputTypeConfig<any>, AnyInputObjectType<ApolloURI>, any>;
};
