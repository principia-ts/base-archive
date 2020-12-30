import type { ASTNode, GraphQLError, GraphQLFormattedError, Source, SourceLocation } from 'graphql'

import { Exception } from '@principia/base/data/Exception'

export class GraphQlException extends Exception<Source | undefined, Record<string, any>> implements GraphQLError {
  readonly code: number | undefined
  readonly locations: ReadonlyArray<SourceLocation> | undefined
  readonly path: ReadonlyArray<string | number> | undefined
  readonly source: Source | undefined
  readonly positions: ReadonlyArray<number> | undefined
  readonly nodes: ReadonlyArray<ASTNode> | undefined
  readonly originalError: Error | undefined
  readonly extensions: Record<string, any> | undefined

  constructor(message: string, code?: number, extensions?: Record<string, any>) {
    super(message, undefined, extensions)
    this.code       = code
    this.extensions = extensions
  }
}

export function formatGraphQlException(
  graphQlError: GraphQLError & { originalError: GraphQlException }
): GraphQLFormattedError {
  return {
    message: graphQlError.originalError.message,
    locations: graphQlError.originalError.locations ?? graphQlError.locations,
    path: graphQlError.originalError.path ?? graphQlError.path,
    extensions: graphQlError.originalError.extensions ?? graphQlError.extensions
  }
}

export function fromGraphQLError(error: GraphQLError, code?: number) {
  const copy: GraphQlException = new GraphQlException(error.message, code)
}
