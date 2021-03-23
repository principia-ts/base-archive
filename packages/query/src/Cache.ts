import type { Request } from './Request'
import type { URef } from '@principia/io/Ref'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as Map from '@principia/base/Map'
import * as O from '@principia/base/Option'
import { tuple } from '@principia/base/tuple'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/Ref'

import { eqRequest } from './Request'

export interface Cache {
  get<E, A>(request: Request<E, A>): I.FIO<void, URef<O.Option<E.Either<E, A>>>>

  lookup<E, A extends Request<E, B>, B>(
    request: A & Request<E, B>
  ): I.UIO<E.Either<URef<O.Option<E.Either<E, B>>>, URef<O.Option<E.Either<E, B>>>>>

  put<E, A>(request: Request<E, A>, result: URef<O.Option<E.Either<E, A>>>): I.UIO<void>
}

export class DefaultCache implements Cache {
  constructor(private state: URef<ReadonlyMap<any, any>>) {}

  get<E, A>(request: Request<E, A>): I.FIO<void, URef<O.Option<E.Either<E, A>>>> {
    return pipe(
      this.state.get,
      I.map(Map.lookupAt(eqRequest)(request)),
      I.get,
      I.orElseFail(() => undefined)
    )
  }

  lookup<E, A extends Request<E, B>, B>(
    request: A
  ): I.UIO<E.Either<URef<O.Option<E.Either<E, B>>>, URef<O.Option<E.Either<E, B>>>>> {
    return pipe(
      Ref.makeRef(O.None<E.Either<E, B>>()),
      I.bind((ref) =>
        Ref.modify_(this.state, (map) =>
          pipe(
            Map.lookupAt_(eqRequest)(map, request),
            O.match(
              () => tuple(E.Left(ref), Map.insertAt_(eqRequest)(map, request, ref)),
              (ref) => tuple(E.Right(ref), map)
            )
          )
        )
      )
    )
  }

  put<E, A>(request: Request<E, A>, result: URef<O.Option<E.Either<E, A>>>): I.UIO<void> {
    return I.asUnit(Ref.update_(this.state, (m) => Map.insertAt(eqRequest)(request, result)(m)))
  }
}

export const empty: I.UIO<Cache> = pipe(
  Ref.makeRef(Map.empty<any, any>()),
  I.map((ref) => new DefaultCache(ref))
)
