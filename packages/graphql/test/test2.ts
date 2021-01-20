import '@principia/base/unsafe/Operators'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import { prettyPrint } from '@principia/codec/DecodeErrors'
import * as D from '@principia/codec/EitherDecoder'
import { HttpException } from '@principia/http/HttpException'
import * as Http from '@principia/http/HttpServer'
import * as R from '@principia/http/Route'
import * as Status from '@principia/http/StatusCode'
import { SyncDecoderM } from '@principia/http/utils'
import * as C from '@principia/io/Console'
import * as I from '@principia/io/IO'
import * as Sy from '@principia/io/Sync'
import * as M from '@principia/model'
import { parse } from 'graphql'
import { inspect } from 'util'

const GraphQlRequest = M.make((F) =>
  F.type({
    query: F.string(),
    variables: F.record(F.nullable_(F.unknown())),
    operation: F.nullable_(F.string())
  })
)

const server = Http.HttpServer({ host: 'localhost', port: 4000 })

const gql = R.route('POST', '/graphql', ({ req, res }) =>
  I.gen(function* (_) {
    const body    = yield* _(req.bodyJson)
    const decoded = yield* _(
      D.decode(M.getDecoder(GraphQlRequest))(body)['|>'](
        E.fold(
          (e) =>
            I.fail(
              new HttpException('Invalid GraphQL request body', {
                originalError: prettyPrint(e),
                status: Status.BadRequest
              })
            ),
          I.succeed
        )
      )
    )

    yield* _(I.effectSuspendTotal(() => C.putStrLn(inspect(parse(decoded.query)))))
    return yield* _(res.end())
  })
)

const program = R.empty['|>'](gql)
  ['|>'](R.HttpExceptionHandler)
  ['|>'](R.drain)
  ['|>'](I.giveLayer(server))
  ['|>'](I.giveLayer(C.NodeConsole.live))

I.run(program)
