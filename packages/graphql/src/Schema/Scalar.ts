import type { GraphQlException } from "./GraphQlException";
import type { Exception } from "@principia/base/data/Exception";
import type { MorphismN } from "@principia/base/data/Function";
import type * as U from "@principia/base/util/types";
import type * as Sy from "@principia/io/Sync";
import type { DirectiveNode, ValueNode } from "graphql";

export interface ScalarConfig {
  readonly description?: string;
  readonly directives?: Array<DirectiveNode>;
}

export type ScalarSerializeF<R, A> = (u: unknown) => Sy.Sync<R, GraphQlException, A>;
export type ScalarParseValueF<R, E> = (u: unknown) => Sy.Sync<R, GraphQlException, E>;
export type ScalarParseLiteralF<R, E> = (valueNode: ValueNode) => Sy.Sync<R, GraphQlException, E>;

export interface ScalarFunctions<I, O> {
  parseLiteral: ScalarParseLiteralF<any, I>;
  parseValue: ScalarParseValueF<any, I>;
  serialize: ScalarSerializeF<any, O>;
}

export type Scalar<Name, E, A> = {
  functions: ScalarFunctions<E, A>;
  name: Name;
};

export type _I<Fs> = Fs extends ScalarFunctions<infer I, any> ? I : never;
export type _O<Fs> = Fs extends ScalarFunctions<any, infer O> ? O : never;

export type ScalarEnv<S extends Scalar<any, any, any>> = U.UnionToIntersection<
  {
    [k in keyof S["functions"]]: S["functions"][k] extends MorphismN<any, infer Ret>
      ? Ret extends Sy.Sync<infer R, any, any>
        ? R
        : never
      : never;
  }[keyof S["functions"]]
>;

export type SchemaScalars = {
  [n: string]: Scalar<any, any, any>;
};

export type SchemaScalarsEnv<S extends SchemaScalars> = U.UnionToIntersection<
  {
    [k in keyof S]: ScalarEnv<S[k]>;
  }[keyof S]
>;
