import type { GQLInputAURI } from "../algebras";
import type { InferredInputAlgebra } from "../HKT";

export const CoreInputPURI = "graphql/programs/CoreInput" as const;
export type CoreInputPURI = typeof CoreInputPURI;

export interface CoreInputAlgebra<ApolloURI extends string>
  extends InferredInputAlgebra<ApolloURI, CoreInputPURI> {}

declare module "../HKT" {
  export interface PURItoInputAlgebras {
    [CoreInputPURI]: GQLInputAURI;
  }
  export interface InputProgramAlgebra<URI> {
    [CoreInputPURI]: CoreInputAlgebra<URI>;
  }
}
