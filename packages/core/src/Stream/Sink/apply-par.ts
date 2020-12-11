import type * as A from "../../Chunk";
import * as E from "../../Either";
import { pipe, tuple } from "../../Function";
import * as T from "../../IO";
import * as R from "../../IORef";
import * as M from "../../Managed";
import * as O from "../../Option";
import { matchTag } from "../../Utils";
import * as Push from "../Push";
import { Sink } from "./model";

class BothRunning {
  readonly _tag = "BothRunning";
}

const bothRunning = new BothRunning();

class LeftDone<Z> {
  readonly _tag = "LeftDone";
  constructor(readonly value: Z) {}
}

class RightDone<Z1> {
  readonly _tag = "RightDone";
  constructor(readonly value: Z1) {}
}

type State<Z, Z1> = BothRunning | LeftDone<Z> | RightDone<Z1>;

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function zipWithPar_<R, R1, E, E1, I, I1, L, L1, Z, Z1, Z2>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
): Sink<R & R1, E | E1, I & I1, L | L1, Z2> {
  return new Sink(
    pipe(
      M.do,
      M.bindS("ref", () => T.toManaged_(R.make<State<Z, Z1>>(bothRunning))),
      M.bindS("p1", () => self.push),
      M.bindS("p2", () => that.push),
      M.map(({ p1, p2, ref }) => {
        return (in_: O.Option<A.Chunk<I & I1>>) =>
          T.chain_(ref.get, (state) => {
            const newState = pipe(
              state,
              matchTag({
                BothRunning: (): T.IO<
                  R & R1,
                  readonly [E.Either<E | E1, Z2>, A.Chunk<L | L1>],
                  State<Z, Z1>
                > => {
                  const l: T.IO<
                    R & R1,
                    readonly [E.Either<E | E1, Z2>, A.Chunk<L | L1>],
                    O.Option<readonly [Z, A.Chunk<L>]>
                  > = T.foldM_(
                    p1(in_),
                    ([e, l]) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as T.IO<
                            R & R1,
                            [E.Either<E | E1, Z2>, A.Chunk<L | L1>],
                            O.Option<readonly [Z, A.Chunk<L>]>
                          >,
                        (z) =>
                          T.succeed(O.some([z, l] as const)) as T.IO<
                            R & R1,
                            [E.Either<E | E1, Z2>, A.Chunk<L | L1>],
                            O.Option<readonly [Z, A.Chunk<L>]>
                          >
                      ),
                    (_) =>
                      T.succeed(O.none()) as T.IO<
                        R & R1,
                        [E.Either<E | E1, Z2>, A.Chunk<L | L1>],
                        O.Option<readonly [Z, A.Chunk<L>]>
                      >
                  );
                  const r: T.IO<
                    R & R1,
                    readonly [E.Either<E | E1, never>, A.Chunk<L | L1>],
                    O.Option<readonly [Z1, A.Chunk<L1>]>
                  > = T.foldM_(
                    p2(in_),
                    ([e, l]) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as T.IO<
                            R & R1,
                            [E.Either<E | E1, never>, A.Chunk<L | L1>],
                            O.Option<readonly [Z1, A.Chunk<L1>]>
                          >,
                        (z) =>
                          T.succeed(O.some([z, l] as const)) as T.IO<
                            R & R1,
                            [E.Either<E | E1, never>, A.Chunk<L | L1>],
                            O.Option<readonly [Z1, A.Chunk<L1>]>
                          >
                      ),
                    (_) =>
                      T.succeed(O.none()) as T.IO<
                        R & R1,
                        [E.Either<E | E1, never>, A.Chunk<L | L1>],
                        O.Option<readonly [Z1, A.Chunk<L1>]>
                      >
                  );

                  return T.chain_(
                    T.zipPar_(l, r),
                    ([lr, rr]): T.IO<
                      R & R1,
                      readonly [E.Either<E1, Z2>, A.Chunk<L | L1>],
                      State<Z, Z1>
                    > => {
                      if (O.isSome(lr)) {
                        const [z, l] = lr.value;

                        if (O.isSome(rr)) {
                          const [z1, l1] = rr.value;

                          return T.fail([
                            E.right(f(z, z1)),
                            l.length > l1.length ? l1 : l
                          ] as const);
                        } else {
                          return T.succeed(new LeftDone(z));
                        }
                      } else {
                        if (O.isSome(rr)) {
                          const [z1] = rr.value;

                          return T.succeed(new RightDone(z1));
                        } else {
                          return T.succeed(bothRunning);
                        }
                      }
                    }
                  ) as T.IO<R & R1, readonly [E.Either<E1, Z2>, A.Chunk<L | L1>], State<Z, Z1>>;
                },
                LeftDone: ({ value: z }) =>
                  T.as_(
                    T.catchAll_(
                      p2(in_),
                      ([e, leftover]): T.IO<
                        R & R1,
                        readonly [E.Either<E | E1, Z2>, A.Chunk<L | L1>],
                        State<Z, Z1>
                      > =>
                        E.fold_(
                          e,
                          (e) => Push.fail(e, leftover),
                          (z1) => Push.emit(f(z, z1), leftover)
                        )
                    ),
                    () => state
                  ),
                RightDone: ({ value: z1 }) =>
                  T.as_(
                    T.catchAll_(
                      p1(in_),
                      ([e, leftover]): T.IO<
                        R & R1,
                        readonly [E.Either<E | E1, Z2>, A.Chunk<L | L1>],
                        State<Z, Z1>
                      > =>
                        E.fold_(
                          e,
                          (e) => Push.fail(e, leftover),
                          (z) => Push.emit(f(z, z1), leftover)
                        )
                    ),
                    () => state
                  )
              })
            );

            return T.chain_(newState, (ns) => (ns === state ? T.unit() : ref.set(ns)));
          });
      })
    )
  );
}

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function zipWithPar<R1, E1, I1, L1, Z, Z1, Z2>(
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => zipWithPar_(self, that, f);
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return zipWithPar_(fa, fb, tuple);
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(
  fa: Sink<R, E, I, L, Z>
) => Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return (fa) => zipPar_(fa, fb);
}

export function apFirstPar_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return zipWithPar_(fa, fb, (z, _) => z);
}

export function apFirstPar<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return (fa) => apFirstPar_(fa, fb);
}

export function apSecondPar_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return zipWithPar_(fa, fb, (_, z1) => z1);
}

export function apSecondPar<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return (fa) => apSecondPar_(fa, fb);
}
