import type { DecodeErrors, ErrorInfo } from "@principia/core/DecodeError";
import * as DE from "@principia/core/DecodeError";
import * as D from "@principia/core/Decoder";
import * as E from "@principia/core/Either";
import * as ED from "@principia/core/EitherDecoder";
import { flow, identity, pipe } from "@principia/core/Function";
import * as Sy from "@principia/core/Sync";
import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as M from "../src";

const SE = DE.getSemigroup<ErrorInfo>();

type SV = Sy.V & HKT.Fix<"E", DecodeErrors>;

function both_<R, R1, A, B>(
  fa: Sy.Sync<R, DecodeErrors, A>,
  fb: Sy.Sync<R1, DecodeErrors, B>
): Sy.Sync<R & R1, DecodeErrors, readonly [A, B]> {
  return pipe(
    Sy.both_(Sy.recover(fa), Sy.recover(fb)),
    Sy.chain(([ea, eb]) => {
      return E.isLeft(ea)
        ? E.isLeft(eb)
          ? Sy.fail(SE.combine_(ea.left, eb.left))
          : Sy.fail(ea.left)
        : E.isLeft(eb)
        ? Sy.fail(eb.left)
        : Sy.succeed([ea.right, eb.right]);
    })
  );
}

function alt_<R, R1, A>(
  me: Sy.Sync<R, DecodeErrors, A>,
  that: () => Sy.Sync<R1, DecodeErrors, A>
): Sy.Sync<R & R1, DecodeErrors, A> {
  return Sy.foldM_(
    me,
    (ea) => Sy.foldM_(that(), (eb) => Sy.fail(SE.combine_(ea, eb)), Sy.succeed),
    Sy.succeed
  );
}

const SyM: P.MonadFail<[Sy.URI], SV> &
  P.Applicative<[Sy.URI], SV> &
  P.Alt<[Sy.URI], SV> &
  P.Bifunctor<[Sy.URI], Sy.V> = HKT.instance({
  fail: Sy.fail as any,
  ...Sy.Monad,
  bimap_: Sy.bimap_,
  bimap: Sy.bimap,
  mapLeft_: Sy.mapError_,
  mapLeft: Sy.mapError,
  unit: Sy.unit,
  both_,
  both: <R, B>(fb: Sy.Sync<R, DecodeErrors, B>) => <R1, A>(fa: Sy.Sync<R1, DecodeErrors, A>) =>
    both_(fa, fb),
  alt_,
  alt: <R, A>(that: () => Sy.Sync<R, DecodeErrors, A>) => <R1>(me: Sy.Sync<R1, DecodeErrors, A>) =>
    alt_(me, that)
});

const t = M.make((F) =>
  F.intersection([
    F.type({
      a: F.optional(F.string({ name: "a string" }), { name: "an optional string" }),
      b: F.number({ name: "a number" })
    }),
    F.type({
      c: pipe(F.number(), (h) => F.refine(h, (a): a is number => a === 42, "the meaning of life"))
    })
  ] as const)
);

pipe(
  M.getDecoder(t)(SyM).decode({ a: "hello", b: 21, c: 43 }),
  Sy.tap((a) => Sy.total(() => console.log(a))),
  Sy.map(M.getEncoder(t).encode),
  Sy.fold(
    (e) => console.log(DE.draw(e)),
    (a) => console.log(a)
  ),
  Sy.runEither
);
