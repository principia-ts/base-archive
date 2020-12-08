import type { FunctionN } from "@principia/core/Function";
import type * as T from "@principia/core/IO";
import type { SerializableError } from "@principia/core/SerializableError";
import type * as U from "@principia/core/Utils";
import type { Compute } from "@principia/prelude/Utils";
import type { ValueNode } from "graphql";

export type ScalarSerializeF<R, A> = (u: unknown) => T.IO<R, SerializableError<any>, A>;
export type ScalarParseValueF<R, E> = (u: unknown) => T.IO<R, SerializableError<any>, E>;
export type ScalarParseLiteralF<R, E> = (
  valueNode: ValueNode
) => T.IO<R, SerializableError<any>, E>;

export interface ScalarFunctions<E, A> {
  parseLiteral: ScalarParseLiteralF<any, E>;
  parseValue: ScalarParseValueF<any, E>;
  serialize: ScalarSerializeF<any, A>;
}

export type Scalar<Name, E, A> = {
  functions: ScalarFunctions<E, A>;
  name: Name;
};

export type ScalarE<Fs> = Fs extends ScalarFunctions<infer E, any> ? E : never;
export type ScalarA<Fs> = Fs extends ScalarFunctions<any, infer A> ? A : never;

export type ScalarEnv<S> = Compute<
  S extends Scalar<any, any, any>
    ? U.UnionToIntersection<
        {
          [k in keyof S["functions"]]: S["functions"][k] extends FunctionN<any, infer Ret>
            ? Ret extends T.IO<infer R, infer _E, infer _A>
              ? unknown extends R
                ? never
                : R
              : never
            : never;
        }[keyof S["functions"]]
      >
    : never,
  "flat"
>;

export type SchemaScalars = {
  [n: string]: Scalar<any, any, any>;
};

export type SchemaScalarsEnv<S> = S extends SchemaScalars
  ? U.UnionToIntersection<
      {
        [k in keyof S]: ScalarEnv<S[k]>;
      }[keyof S]
    >
  : never;
