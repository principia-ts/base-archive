import type { DataSourceAspect } from './DataSourceAspect'
import type { Request } from './Request'
import type { Eq } from '@principia/base/Eq'
import type * as O from '@principia/base/Option'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { makeEq } from '@principia/base/Eq'
import { IllegalArgumentError } from '@principia/base/Error'
import { flow, not, pipe, tuple } from '@principia/base/function'
import * as I from '@principia/io/IO'

import { CompletedRequestMap } from './CompletedRequestMap'
import { Described } from './Described'

export class DataSource<R, A> {
  constructor(
    readonly identifier: string,
    readonly runAll: (requests: ReadonlyArray<ReadonlyArray<A>>) => I.IO<R, never, CompletedRequestMap>
  ) {}
  ['@@']<R1>(aspect: DataSourceAspect<R1>): DataSource<R & R1, A> {
    return aspect.apply(this)
  }
}

export function batchN_<R, A>(dataSource: DataSource<R, A>, n: number): DataSource<R, A> {
  return new DataSource(`${dataSource.identifier}.batchN(${n})`, (requests) =>
    n < 1
      ? I.die(new IllegalArgumentError('batchN: n must be at least one', 'DataSource.batchN'))
      : dataSource.runAll(A.foldl_(requests, A.empty(), (b, a) => A.concat_(b, A.chunksOf_(a, n))))
  )
}

export function contramapM_<R, A, R1, B>(
  dataSource: DataSource<R, A>,
  f: Described<(b: B) => I.IO<R1, never, A>>
): DataSource<R & R1, B> {
  return new DataSource(
    `${dataSource.identifier}.contramapM(${f.description})`,
    flow(I.foreach(I.foreachPar(f.value)), I.bind(dataSource.runAll))
  )
}

export function eitherWith_<R, A, R1, B, C>(
  ds1: DataSource<R, A>,
  ds2: DataSource<R1, B>,
  f: Described<(c: C) => E.Either<A, B>>
): DataSource<R & R1, C> {
  return new DataSource(
    `${ds1.identifier}.eitherWith(${ds2.identifier}, ${f.description})`,
    flow(
      I.foreach((rs) => {
        const [left, right] = A.partitionMap_(rs, f.value)
        return pipe(
          ds1.runAll([left]),
          I.crossWithPar(ds2.runAll([right]), (a, b) => a.concat(b))
        )
      }),
      I.map(A.foldl(CompletedRequestMap.empty(), (b, a) => b.concat(a)))
    )
  )
}

export function equals(ds1: DataSource<any, any>, ds2: DataSource<any, any>): boolean {
  return ds1.identifier === ds2.identifier
}

export function gives_<R, A, R0>(ds: DataSource<R, A>, f: Described<(r0: R0) => R>): DataSource<R0, A> {
  return new DataSource(`${ds.identifier}.giveSome(${f.description})`, flow(ds.runAll, I.gives(f.value)))
}

export function giveAll_<R, A>(ds: DataSource<R, A>, r: Described<R>): DataSource<unknown, A> {
  return gives_(
    ds,
    Described((_) => r.value, `(_) => ${r.description}`)
  )
}

export function race_<R, A, R1, A1 extends A>(ds1: DataSource<R, A>, ds2: DataSource<R1, A1>): DataSource<R & R1, A1> {
  return new DataSource(`${ds1.identifier}.race(${ds2.identifier})`, (requests) =>
    pipe(ds1.runAll(requests), I.race(ds2.runAll(requests)))
  )
}

export class Batched<R, A> extends DataSource<R, A> {
  constructor(
    readonly identifier: string,
    readonly run: (requests: ReadonlyArray<A>) => I.IO<R, never, CompletedRequestMap>
  ) {
    super(
      identifier,
      I.foldl(CompletedRequestMap.empty(), (m, r) => {
        const newRequests = A.filter_(r, not(m.contains))
        if (A.isEmpty(newRequests)) {
          return I.succeed(m)
        } else {
          return pipe(
            this.run(newRequests),
            I.map((_) => m.concat(_))
          )
        }
      })
    )
  }
}

export function makeBatched<R, A>(
  name: string,
  f: (requests: ReadonlyArray<A>) => I.IO<R, never, CompletedRequestMap>
): Batched<R, A> {
  return new Batched(name, f)
}

export function fromFunction<A extends Request<never, B>, B>(name: string, f: (a: A) => B): DataSource<unknown, A> {
  return new Batched<unknown, A>(
    name,
    flow(
      A.foldl(CompletedRequestMap.empty(), (m, k) => m.insert(k, E.Right(f(k)))),
      I.succeed
    )
  )
}

export function fromFunctionBatchedM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>>
): DataSource<R, A> {
  return new Batched<R, A>(name, (requests: ReadonlyArray<A>) =>
    pipe(
      f(requests),
      I.match(
        (e): ReadonlyArray<readonly [A, E.Either<E, B>]> => A.map_(requests, (_) => tuple(_, E.Left(e))),
        (bs): ReadonlyArray<readonly [A, E.Either<E, B>]> => A.zip_(requests, A.map_(bs, E.Right))
      ),
      I.map(A.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
    )
  )
}

export function fromFunctionBatched<A extends Request<never, B>, B>(
  name: string,
  f: (a: ReadonlyArray<A>) => ReadonlyArray<B>
): DataSource<unknown, A> {
  return fromFunctionBatchedM(name, flow(f, I.succeed))
}

export function fromFunctionBatchedOptionM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<O.Option<B>>>
): DataSource<R, A> {
  return new Batched<R, A>(name, (requests: ReadonlyArray<A>) =>
    pipe(
      f(requests),
      I.match(
        (e): ReadonlyArray<readonly [A, E.Either<E, O.Option<B>>]> => A.map_(requests, (a) => tuple(a, E.Left(e))),
        (bs): ReadonlyArray<readonly [A, E.Either<E, O.Option<B>>]> => A.zip_(requests, A.map_(bs, E.Right))
      ),
      I.map(A.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insertOption(k, v)))
    )
  )
}

export function fromFunctionBatchedOption<A extends Request<never, B>, B>(
  name: string,
  f: (a: ReadonlyArray<A>) => ReadonlyArray<O.Option<B>>
): DataSource<unknown, A> {
  return fromFunctionBatchedOptionM(name, flow(f, I.succeed))
}

export function fromFunctionBatchedWithM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>>,
  g: (b: B) => Request<E, B>
): DataSource<R, A> {
  return new Batched<R, A>(name, (requests: ReadonlyArray<A>) =>
    pipe(
      f(requests),
      I.match(
        (e): ReadonlyArray<readonly [Request<E, B>, E.Either<E, B>]> => A.map_(requests, (a) => tuple(a, E.Left(e))),
        (bs): ReadonlyArray<readonly [Request<E, B>, E.Either<E, B>]> => A.map_(bs, (b) => tuple(g(b), E.Right(b)))
      ),
      I.map(A.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
    )
  )
}

export function fromFunctionBatchedWith<A extends Request<never, B>, B>(
  name: string,
  f: (a: ReadonlyArray<A>) => ReadonlyArray<B>,
  g: (b: B) => Request<never, B>
): DataSource<unknown, A> {
  return fromFunctionBatchedWithM(name, flow(f, I.succeed), g)
}

export function fromFunctionM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: A) => I.IO<R, E, B>
): DataSource<R, A> {
  return new Batched<R, A>(
    name,
    flow(
      I.foreachPar((a) =>
        pipe(
          f(a),
          I.attempt,
          I.map((r) => tuple(a, r))
        )
      ),
      I.map(A.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insert(k, v)))
    )
  )
}

export function fromFunctionOptionM<R, E, A extends Request<E, B>, B>(
  name: string,
  f: (a: A) => I.IO<R, E, O.Option<B>>
): DataSource<R, A> {
  return new Batched<R, A>(
    name,
    flow(
      I.foreachPar((a) =>
        pipe(
          f(a),
          I.attempt,
          I.map((r) => tuple(a, r))
        )
      ),
      I.map(A.foldl(CompletedRequestMap.empty(), (map, [k, v]) => map.insertOption(k, v)))
    )
  )
}

export function fromFunctionOption<A extends Request<never, B>, B>(
  name: string,
  f: (a: A) => O.Option<B>
): DataSource<unknown, A> {
  return fromFunctionOptionM(name, flow(f, I.succeed))
}

export const never: DataSource<unknown, any> = new DataSource('never', () => I.never)

export const eqDataSource: Eq<DataSource<any, any>> = makeEq((x, y) => x.identifier === y.identifier)
