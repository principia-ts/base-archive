import type { Option } from '@principia/base/Option'

import * as A from '@principia/base/Array'
import { pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'

export class TestArgs {
  constructor(
    readonly testSearchTerms: ReadonlyArray<string>,
    readonly tagSearchTerms: ReadonlyArray<string>,
    readonly testTaskPolicy: Option<string>
  ) {}
}

export const empty: TestArgs = new TestArgs(A.empty(), A.empty(), O.None())

export function parse(args: ReadonlyArray<string>): TestArgs {
  const [terms, tags, policies] = pipe(
    args,
    A.chunksOf(2),
    A.filterMap((as) => {
      if (as[0] === '-t') {
        return O.Some(tuple('testSearchTerm', as[1]))
      }
      if (as[0] === '-tags') {
        return O.Some(tuple('tagSearchTerm', as[1]))
      }
      if (as[0] === '-policy') {
        return O.Some(tuple('policy', as[1]))
      }
      return O.None()
    }),
    A.foldl(
      tuple(<ReadonlyArray<string>>[], <ReadonlyArray<string>>[], <ReadonlyArray<string>>[]),
      ([terms, tags, policy], [k, v]) => {
        switch (k) {
          case 'testSearchTerm': {
            return tuple(A.append(v)(terms), tags, policy)
          }
          case 'tagSearchTerm': {
            return tuple(terms, A.append(v)(tags), policy)
          }
          case 'policy': {
            return tuple(terms, tags, A.append(v)(policy))
          }
          default: {
            return tuple(terms, tags, policy)
          }
        }
      }
    )
  )
  return new TestArgs(terms, tags, A.head(policies))
}
