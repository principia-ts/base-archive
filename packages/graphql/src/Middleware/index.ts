import type {
  SchemaResolvers,
  SchemaResolversEnv,
  SchemaScalars,
  SchemaScalarsEnv
} from "../Schema";
import type { Has } from "@principia/base/data/Has";
import type { DocumentNode } from "graphql";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import * as R from "@principia/base/data/Record";
import * as Str from "@principia/base/data/String";
import * as Http from "@principia/http";
import { UrlQuery } from "@principia/http/middleware/QueryParser";
import * as I from "@principia/io/IO";
import * as M from "@principia/model";
import { makeExecutableSchema } from "graphql-tools";

export function withGraphQl<
  URI extends string,
  Ctx,
  R extends SchemaResolvers<URI, any, Ctx, R, any>,
  S extends SchemaScalars = {}
>(
  typedefs: DocumentNode,
  resolvers: R,
  scalars?: S
): <R, E>(
  routes: Http.Routes<R, E>
) => Http.Routes<
  R & Has<UrlQuery> & SchemaResolversEnv<URI, R, Ctx> & SchemaScalarsEnv<S>,
  E | Http.HttpRouteException
> {
  return (routes) => Http.addMiddleware_(routes, (cont) => (ctx, next) => {

  });
}

export interface GraphQLParams {
  query: string | null;
  variables: { readonly [name: string]: unknown } | null;
  operationName: string | null;
  raw: boolean;
}

const GraphQlRequest = M.make((F) => F.type({}));

function getGraphQLParams(
  request: Http.Request
): I.IO<Has<UrlQuery>, Http.HttpRouteException, GraphQLParams> {
  return I.gen(function* ($) {
    const { urlQuery } = yield* $(UrlQuery);
    const contentType = yield* $(request.parsedContentType);
    const body = O.isSome(contentType)
      ? contentType.value.type === "application/graphql"
        ? { query: yield* $(request.rawBody) }
        : contentType.value.type === "application/json"
        ? yield* $(request.bodyJson)
        : contentType.value.type === "application/x-www-form-urlencoded"
        ? O.getOrElse_(urlQuery, () => ({}))
        : {}
      : {};

    const query = pipe(
      urlQuery,
      O.flatMap(R.lookup("query")),
      O.getOrElse(() => body?.query)
    );

    const variables = pipe(
      urlQuery,
      O.flatMap(R.lookup("variables")),
      O.getOrElse(() => body?.variables)
    );

    const operationName = pipe(
      urlQuery,
      O.flatMap(R.lookup("operationName")),
      O.getOrElse(() => body?.operationName)
    );

    const raw = pipe(
      urlQuery,
      O.map((q) => q["raw"] != null),
      O.getOrElse(() => body["raw"] != null)
    );

    return { query, variables, operationName, raw };
  });
}
