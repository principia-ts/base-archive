import * as E from '@principia/base/data/Either'
import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as X from '../../SIO'
import * as I from './_internal/io'

function _integrateSIO() {
  if (X.SIOtoIO.get._tag === 'None') {
    X.SIOtoIO.set(
      O.some(<R, E, A>(sync: X.SIO<unknown, never, R, E, A>) =>
        I.asksM((_: R) => I.effectSuspendTotal(() => pipe(sync, X.runEitherEnv(_), E.fold(I.fail, I.succeed))))
      )
    )
  }
}

_integrateSIO()
