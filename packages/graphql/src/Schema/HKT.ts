import type { UnionToIntersection } from "@principia/base/util/types";

export interface AURItoInputAlgebra {}

export type InputAURIS = keyof AURItoInputAlgebra;

export interface AURItoFieldAlgebra<Root, T> {}

export type FieldAURIS = keyof AURItoFieldAlgebra<any, any>;

export type FieldAlgebra<AURI extends FieldAURIS, Root, T> = UnionToIntersection<
  AURItoFieldAlgebra<Root, T>[AURI]
>;

export type InputAlgebra<AURI extends InputAURIS> = UnionToIntersection<AURItoInputAlgebra[AURI]>;

export type FieldPURIS = keyof PURItoFieldAlgebras;

export type InputPURIS = keyof PURItoInputAlgebras;

export interface InputProgramAlgebra {}

export interface FieldProgramAlgebra<Root, T> {}

export interface PURItoInputAlgebras {}

export interface PURItoFieldAlgebras {}

export type InferredInputAlgebra<PURI extends InputPURIS> = InputAlgebra<PURItoInputAlgebras[PURI]>;

export type InferredFieldAlgebra<PURI extends FieldPURIS, Root, T> = FieldAlgebra<
  PURItoFieldAlgebras[PURI],
  Root,
  T
>;
