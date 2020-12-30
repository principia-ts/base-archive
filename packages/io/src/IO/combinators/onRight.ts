import type { Either } from '@principia/base/data/Either'

import * as I from '../core'
import { joinEither_ } from './join'

export function onRight<C>(): <R, E, A>(io: I.IO<R, E, A>) => I.IO<Either<C, R>, E, Either<C, A>> {
  return (io) => joinEither_(I.ask<C>(), io)
}
