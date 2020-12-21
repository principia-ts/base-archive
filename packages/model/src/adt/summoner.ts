import type { SumURI, TaggedUnionConfig } from "../algebra";
import type {
  Algebra,
  Config,
  InterpretedHKT,
  InterpreterURIS,
  Model,
  ProgramURIS,
  ResultURIS,
  URItoProgram
} from "../HKT";
import type { _A, _E, _R, _S, InhabitedTypes } from "../utils";
import type { ADT } from "./model";
import type { ElemType } from "./utils";

import * as A from "@principia/base/data/Array";
import * as Eq from "@principia/base/data/Eq";
import { tuple } from "@principia/base/data/Function";
import * as R from "@principia/base/data/Record";
import { getFirstSemigroup } from "@principia/base/Semigroup";

import { assignCallable, wrapFun } from "../utils";
import { makeADT } from "./model";

export type TaggedUnionProgram<PURI extends ProgramURIS, Env, S, R, E, A> = URItoProgram<
  Env,
  S,
  R,
  E,
  A
>[PURI] &
  (<G extends InterpreterURIS>(a: Algebra<SumURI, G, Env>) => InterpretedHKT<G, Env, S, R, E, A>);

type AnyTypes = Record<string, InhabitedTypes<any, any, any, any, any>>;

const recordFromArray = R.fromFoldable(getFirstSemigroup<any>(), A.Foldable);
const keepKeys = (a: Record<string, any>, toKeep: Array<string>): object =>
  recordFromArray(
    A.intersection(Eq.string)(toKeep)(Object.keys(a)).map((k: string) => tuple(k, a[k]))
  );

const excludeKeys = (a: Record<string, any>, toExclude: Array<string>): object =>
  recordFromArray(
    A.difference(Eq.string)(toExclude)(Object.keys(a)).map((k: string) => tuple(k, a[k]))
  );

type AnyADTTypes = {
  [k in keyof AnyTypes]: [any, any, any, any];
};

interface HasTypes<Types extends AnyADTTypes> {
  _Types: Types;
}

type AnyMorph<PURI extends ProgramURIS, RURI extends ResultURIS, Env> = Model<
  PURI,
  RURI,
  Env,
  any,
  any,
  any,
  any
>;

export type UnionTypes<
  PURI extends ProgramURIS,
  RURI extends ResultURIS,
  Env,
  Types extends AnyTypes,
  Tag extends keyof any
> = {
  [k in keyof Types]: Model<
    PURI,
    RURI,
    Env,
    _S<Types[k]>,
    _R<Types[k]>,
    _E<Types[k]>,
    _A<Types[k]> & { [t in Tag]: k }
  >;
};

export type SOfTypes<Types extends AnyADTTypes> = Types[keyof Types][0];

export type ROfTypes<Types extends AnyADTTypes> = Types[keyof Types][1];

export type EOfTypes<Types extends AnyADTTypes> = Types[keyof Types][2];

export type AOfTypes<Types extends AnyADTTypes> = Types[keyof Types][3];

export type MorphADT<
  PURI extends ProgramURIS,
  RURI extends ResultURIS,
  Env,
  Types extends AnyADTTypes,
  Tag extends string
> = HasTypes<Types> &
  ADT<AOfTypes<Types>, Tag> &
  Model<PURI, RURI, Env, SOfTypes<Types>, ROfTypes<Types>, EOfTypes<Types>, AOfTypes<Types>> &
  Refinable<PURI, RURI, Env, Types, Tag>;

export interface Refinable<
  PURI extends ProgramURIS,
  RURI extends ResultURIS,
  Env,
  Types extends AnyADTTypes,
  Tag extends string
> {
  selectMorph: <Keys extends (keyof Types)[]>(
    keys: Keys,
    config?: {
      name?: string;
      config?: Config<
        Env,
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][0];
        }[Extract<keyof Types, ElemType<Keys>>],
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][1];
        }[Extract<keyof Types, ElemType<Keys>>],
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][2];
        }[Extract<keyof Types, ElemType<Keys>>],
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][3];
        }[Extract<keyof Types, ElemType<Keys>>],
        TaggedUnionConfig<
          {
            [k in Extract<keyof Types, ElemType<Keys>>]: Types[k];
          }
        >
      >;
    }
  ) => MorphADT<
    PURI,
    RURI,
    Env,
    {
      [k in Extract<keyof Types, ElemType<Keys>>]: Types[k];
    },
    Tag
  >;
  excludeMorph: <Keys extends (keyof Types)[]>(
    keys: Keys,
    config?: {
      name?: string;
      config?: Config<
        Env,
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][0];
        }[Exclude<keyof Types, ElemType<Keys>>],
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][1];
        }[Exclude<keyof Types, ElemType<Keys>>],
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][2];
        }[Exclude<keyof Types, ElemType<Keys>>],
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][3];
        }[Exclude<keyof Types, ElemType<Keys>>],
        TaggedUnionConfig<
          {
            [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k];
          }
        >
      >;
    }
  ) => MorphADT<
    PURI,
    RURI,
    Env,
    {
      [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k];
    },
    Tag
  >;
}

export type TaggedBuilder<PURI extends ProgramURIS, RURI extends ResultURIS, Env> = <
  Tag extends string
>(
  tag: Tag
) => <Types extends UnionTypes<PURI, RURI, Env, Types, Tag>>(
  o: Types,
  config?: {
    name?: string;
    config?: Config<
      Env,
      Types[keyof Types]["_S"],
      Types[keyof Types]["_R"],
      Types[keyof Types]["_E"],
      Types[keyof Types]["_A"],
      TaggedUnionConfig<Types>
    >;
  }
) => MorphADT<
  PURI,
  RURI,
  Env,
  {
    [k in keyof Types]: Types[k] extends InhabitedTypes<any, infer S, infer R, infer E, infer A>
      ? [S, R, E, A]
      : never;
  },
  Tag
>;

export function makeTagged<PURI extends ProgramURIS, RURI extends ResultURIS, Env>(
  summ: <S, R, E, A>(
    F: TaggedUnionProgram<PURI, Env, S, R, E, A>
  ) => Model<PURI, RURI, Env, S, R, E, A>
): TaggedBuilder<PURI, RURI, Env>;
export function makeTagged<PURI extends ProgramURIS, RURI extends ResultURIS, Env>(
  summ: <S, R, E, A>(
    F: TaggedUnionProgram<PURI, Env, S, R, E, A>
  ) => Model<PURI, RURI, Env, S, R, E, A>
): <Tag extends string>(
  tag: Tag
) => <Types extends UnionTypes<PURI, RURI, Env, Types, Tag>>(
  o: Types,
  config?: {
    name?: string;
    config?: Config<
      Parameters<Types[keyof Types]["_Env"]>[0],
      Types[keyof Types]["_S"],
      Types[keyof Types]["_R"],
      Types[keyof Types]["_E"],
      Types[keyof Types]["_A"],
      TaggedUnionConfig<Types>
    >;
  }
) => MorphADT<
  PURI,
  RURI,
  Env,
  {
    [k in keyof Types]: Types[k] extends InhabitedTypes<any, infer S, infer R, infer E, infer A>
      ? [S, R, E, A]
      : never;
  },
  Tag
> {
  return (tag) => (o, config) => {
    const summoned = summ((F: any) =>
      F.taggedUnion(
        tag,
        R.mapWithIndex((_k, v: AnyMorph<PURI, RURI, Env>) => (v as any)(F))(o),
        config
      )
    ) as any;

    const adt = makeADT(tag)(o as any);

    const preTagged = makeTagged(summ)(tag);

    const selectMorph = (selectedKeys: string[], c?: { name?: string; config?: any }) =>
      preTagged(keepKeys(o, selectedKeys as string[]), {
        name: c?.name || config?.name,
        config: { ...config?.config, ...c?.config }
      });
    const excludeMorph = (selectedKeys: string[], c?: { name?: string; config?: any }) =>
      preTagged(excludeKeys(o, selectedKeys as string[]), {
        name: c?.name || config?.name,
        config: { ...config?.config, ...c?.config }
      });

    const res = assignCallable(wrapFun(summoned as any), {
      ...summoned,
      ...adt,
      selectMorph,
      excludeMorph
    });

    return res;
  };
}
