import type { DecodeError } from './FreeDecodeError'
import type { MonadDecoder } from './MonadDecoder'
import type * as Eval from '@principia/base/Eval'
import type { RoseTree } from '@principia/base/RoseTree'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { identity, pipe } from '@principia/base/function'
import * as HKT from '@principia/base/HKT'
import * as T from '@principia/base/RoseTree'
import * as P from '@principia/base/typeclass'
import { isArray, isPlain } from '@principia/base/util/predicates'
import * as FS from '@principia/free/FreeSemigroup'

import { getSemigroup, Info, Leaf, match } from './FreeDecodeError'

type Eval<A> = Eval.Eval<A>

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type DecodeErrors = FS.FreeSemigroup<DecodeError<ErrorInfo>>

export interface ErrorInfo {
  label?: string
  id?: string
  message?: string
}

/*
 * -------------------------------------------
 * Utilities
 * -------------------------------------------
 */

const showErrorInfo = (info: ErrorInfo): string =>
  info.label && info.message ? `${info.label}: ${info.message}` : info.label ?? info.message ?? ''

const isInfoPopulated = (info?: ErrorInfo): info is ErrorInfo => !!info?.id || !!info?.label || !!info?.message

export function error(actual: unknown, expected: string, errorInfo?: ErrorInfo): DecodeErrors {
  return isInfoPopulated(errorInfo)
    ? FS.Combine(FS.Element(Leaf(actual, expected)), FS.Element(Info(errorInfo)))
    : FS.Element(Leaf(actual, expected))
}

const toTree: (e: DecodeError<ErrorInfo>) => RoseTree<string> = match({
  Leaf: (input, expected) => T.make(`cannot decode ${JSON.stringify(input)}, should be ${expected}`, A.empty()),
  Key: (key, kind, errors) => T.make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) => T.make(`${kind} index ${index}`, toForest(errors)),
  Member: (index, errors) => T.make(`member ${index}`, toForest(errors)),
  Lazy: (id, errors) => T.make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => T.make(showErrorInfo(error), toForest(errors)),
  Info: (error) => T.make(showErrorInfo(error), A.empty())
})

export function toForest(e: DecodeErrors): ReadonlyArray<RoseTree<string>> {
  const stack = []
  let focus   = e
  const res   = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    switch (focus._tag) {
      case 'Element':
        res.push(toTree(focus.value))
        if (stack.length === 0) {
          return res
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          focus = stack.pop()!
        }
        break
      case 'Combine':
        stack.push(focus.right)
        focus = focus.left
        break
    }
  }
}

export function prettyPrint(e: DecodeErrors): string {
  return toForest(e)
    .map(T.drawTree({ show: identity }))
    .join('\n')
}

const toObject: (e: DecodeError<ErrorInfo>) => Record<string, any> = match({
  Leaf: (actual, expected) => ({ actual, expected: [expected] }),
  Key: (key, _, errors) => ({ [key]: paths(errors) }),
  Index: (index, _, errors) => ({ [index]: paths(errors) }),
  Member: (_, errors) => paths(errors),
  Lazy: (_, errors) => paths(errors),
  Wrap: (_, errors) => paths(errors),
  Info: (info) => ({ info })
})

function merge(x: Record<string, any>, y: Record<string, any>): Record<string, any> {
  const res: Record<string, any> = {}
  /* eslint-disable functional/immutable-data */
  for (const key in x) {
    res[key] = x[key]
  }
  for (const key in y) {
    const current = y[key]
    if (isPlain(current)) {
      if (res[key] && isPlain(res[key])) {
        res[key] = merge(res[key], current)
      } else {
        res[key] = current
      }
    } else if (isArray(current)) {
      if (res[key]) {
        if (isArray(res[key])) {
          res[key] = current.concat(res[key])
        }
      } else {
        res[key] = current
      }
    } else {
      res[key] = current
    }
  }
  return res
  /* eslint-enable */
}

export function paths(e: DecodeErrors): Record<string, any> {
  const stack = []
  let focus   = e
  let res     = {}
  for (;;) {
    switch (focus._tag) {
      case 'Element': {
        res = merge(res, toObject(focus.value))
        if (stack.length === 0) {
          return res
        } else {
          focus = stack.pop()!
        }
        break
      }
      case 'Combine': {
        stack.push(focus.right)
        focus = focus.left
        break
      }
    }
  }
}

/*
 * -------------------------------------------
 * Validation Monad
 * -------------------------------------------
 */

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.Fix<'E', DecodeErrors>

export function getValidation<M extends HKT.URIS, C = HKT.Auto>(
  M: P.MonadExcept<M, C> & P.Bifunctor<M, C>
): MonadDecoder<M, C, DecodeErrors>
export function getValidation<M>(
  M: P.MonadExcept<HKT.UHKT2<M>> & P.Bifunctor<HKT.UHKT2<M>>
): MonadDecoder<HKT.UHKT2<M>, HKT.Auto, DecodeErrors> {
  const attempt = P.attemptF(M)

  const crossWith_: P.CrossWithFn_<HKT.UHKT2<M>, V<HKT.Auto>> = (fa, fb, f) =>
    P.flattenF(M)(
      M.crossWith_(attempt(fa), attempt(fb), (ea, eb) =>
        E.isLeft(ea)
          ? E.isLeft(eb)
            ? M.fail(FS.Combine(ea.left, eb.left))
            : M.fail(ea.left)
          : E.isLeft(eb)
          ? M.fail(eb.left)
          : M.pure(f(ea.right, eb.right))
      )
    )

  const alt_: P.AltFn_<HKT.UHKT2<M>, V<HKT.Auto>> = (fa, that) =>
    pipe(
      attempt(fa),
      M.bind(E.match((e) => pipe(attempt(that()), M.bind(E.match((e1) => M.fail(FS.Combine(e, e1)), M.pure))), M.pure))
    )

  return HKT.instance<
    P.Monad<HKT.UHKT2<M>, V<HKT.Auto>> &
      P.Alt<HKT.UHKT2<M>, V<HKT.Auto>> &
      P.Bifunctor<HKT.UHKT2<M>, HKT.Auto> &
      P.Fail<HKT.UHKT2<M>, HKT.Auto>
  >({
    ...P.Monad({
      map_: M.map_,
      crossWith_,
      bind_: M.bind_,
      flatten: M.flatten,
      unit: M.unit,
      pure: M.pure
    }),
    ...P.Alt({
      map_: M.map_,
      alt_
    }),
    ...P.Bifunctor({
      mapLeft_: M.mapLeft_,
      mapRight_: M.mapRight_,
      bimap_: M.bimap_
    }),
    fail: M.fail
  })
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Semigroup = getSemigroup<ErrorInfo>()
