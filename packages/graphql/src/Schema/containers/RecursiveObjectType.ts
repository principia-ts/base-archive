import type { OutputTypeConfig } from "../Config";

export type RecursiveTypeDef<Name extends string, Shape extends Record<string, any>> = {
  _A: Shape;
  _NAME: Name;
};

export class RecursiveType<
  URI extends string,
  Config extends OutputTypeConfig,
  Type extends RecursiveTypeDef<any, any>,
  A
> {
  _T!: Type;
  _A!: A;
  _URI!: URI;
  _tag = "RecursiveType" as const;
  constructor(public name: Type["_NAME"], public config: Config) {}
}
