import type { GQLFieldAURI, GQLInputAURI } from "../algebras";
import type { InferredFieldAlgebra } from "../HKT";

export const CoreFieldPURI = "graphql/programs/CoreField" as const;
export type CoreFieldPURI = typeof CoreFieldPURI;

export interface CoreFieldAlgebra<URI extends string, Root, Ctx>
  extends InferredFieldAlgebra<URI, CoreFieldPURI, Root, Ctx> {}

declare module "../HKT" {
  export interface PURItoFieldAlgebras {
    [CoreFieldPURI]: GQLFieldAURI | GQLInputAURI;
  }
  export interface FieldProgramAlgebra<URI, Root, Ctx> {
    [CoreFieldPURI]: CoreFieldAlgebra<URI, Root, Ctx>;
  }
}
