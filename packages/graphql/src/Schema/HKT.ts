import type { UnionToIntersection } from "@principia/base/util/types";

export interface AURItoInputAlgebra<URI extends string> {}

export type InputAURIS = keyof AURItoInputAlgebra<any>;

export interface AURItoFieldAlgebra<URI extends string, Root, Ctx> {}

export type FieldAURIS = keyof AURItoFieldAlgebra<any, any, any>;

export type FieldAlgebra<
  URI extends string,
  AURI extends FieldAURIS,
  Root,
  Ctx
> = UnionToIntersection<AURItoFieldAlgebra<URI, Root, Ctx>[AURI]>;

export type InputAlgebra<ApolloURI extends string, AURI extends InputAURIS> = UnionToIntersection<
  AURItoInputAlgebra<ApolloURI>[AURI]
>;

export type FieldPURIS = keyof PURItoFieldAlgebras;

export type InputPURIS = keyof PURItoInputAlgebras;

export interface InputProgramAlgebra<URI extends string> {}

export interface FieldProgramAlgebra<URI extends string, Root, Ctx> {}

export interface PURItoInputAlgebras {}

export interface PURItoFieldAlgebras {}

export type InferredInputAlgebra<URI extends string, PURI extends InputPURIS> = InputAlgebra<
  URI,
  PURItoInputAlgebras[PURI]
>;

export type InferredFieldAlgebra<
  URI extends string,
  PURI extends FieldPURIS,
  Root,
  Ctx
> = FieldAlgebra<URI, PURItoFieldAlgebras[PURI], Root, Ctx>;
