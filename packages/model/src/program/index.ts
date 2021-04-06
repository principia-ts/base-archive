import type { InferredAlgebra, InferredProgram } from '../abstract/Program'
import type {
  IntersectionURI,
  NewtypeURI,
  NullableURI,
  PrimitivesURI,
  RecordURI,
  RecursiveURI,
  RefinementURI,
  SetURI,
  StructURI,
  SumURI,
  UnknownURI
} from '../algebra'
import type { AnyEnv } from '../HKT'

export const PURI = 'model/NoUnion'

export type PURI = typeof PURI

export interface NoUnion<Env extends AnyEnv> extends InferredAlgebra<PURI, Env> {}

export interface P<Env extends AnyEnv, I, E, A, O> extends InferredProgram<PURI, Env, I, E, A, O> {}

declare module '../HKT' {
  interface URItoAURIS {
    readonly [PURI]:
      | PrimitivesURI
      | StructURI
      | RecursiveURI
      | NewtypeURI
      | RecordURI
      | RefinementURI
      | SetURI
      | SumURI
      | NullableURI
      | IntersectionURI
      | UnknownURI
  }
  interface URItoProgramAlgebra<Env> {
    readonly [PURI]: NoUnion<Env>
  }
  interface URItoProgram<Env, I, E, A, O> {
    readonly [PURI]: P<Env, I, E, A, O>
  }
}
