import '@principia/base/Operators'

import * as S from '../src/Sync'
import * as SRef from '../src/SyncRef'

const arr = [1, 2, 3, 4, 5, 6, 7, 8]

SRef.makeSyncRef([] as string[])
  ['>>=']((ref) =>
    S.foreach_(arr, (n) =>
      SRef.modify_(ref, (x) => {
        x.push(n.toString())
        return [undefined, x]
      })
    )['*>'](ref.get)
  )
  ['>>=']((s) => S.effectTotal(() => console.log(s)))
  ['|>'](S.run)
