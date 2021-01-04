import * as M from '@principia/model'

const HttpRouteException_ = M.make((F) =>
  F.type({
    _tag: F.stringLiteral('HttpRouteException'),
    message: F.string(),
    status: F.number()
  })
)

export interface HttpRouteException extends M._A<typeof HttpRouteException_> {}

export const HttpRouteException = M.opaque_<HttpRouteException>()(HttpRouteException_)

export const isHttpRouteException = M.getGuard(HttpRouteException).is
