import * as T from "@principia/effect/Effect";
import type { MonadFail } from "@principia/prelude";
import { pipe } from "@principia/prelude/Function";
import type * as HKT from "@principia/prelude/HKT";

import type { Guard } from "../Guard";
import { string } from "../Guard";
import { fromRefinement } from "../KleisliDecoder";
import type { KleisliDecoder } from "../KleisliDecoder/KleisliDecoder";
import type { Config } from "./Config";
import { getApplyConfig } from "./Config";
import type {
   ConcreteInterpreterURIS,
   InferredAlgebra,
   InferredProgram,
   InterpreterHKT,
   InterpreterKind,
   Program,
   Summoner
} from "./HKT";
import { implementInterpreter } from "./HKT";

export interface StringConfig {}

export interface Primitives<
   IURI extends ConcreteInterpreterURIS,
   IC,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E
> {
   readonly string: <N1 extends string, K1, Q1, W1, X1, I1, S1, R1>(
      _: Config<IC, F, C, unknown, N, K, Q, W, X, I, S, R, E, string, N1, K1, Q1, W1, X1, I1, S1, R1, StringConfig>
   ) => InterpreterKind<
      IURI,
      IC,
      F,
      C,
      unknown,
      HKT.Mix<C, "N", [N, N1]>,
      HKT.Mix<C, "K", [K, K1]>,
      HKT.Mix<C, "Q", [Q, Q1]>,
      HKT.Mix<C, "W", [W, W1]>,
      HKT.Mix<C, "X", [X, X1]>,
      HKT.Mix<C, "I", [I, I1]>,
      HKT.Mix<C, "S", [S, S1]>,
      HKT.Mix<C, "R", [R, R1]>,
      E,
      string
   >;
}

export interface PrimitivesHKT<
   IURI,
   IC,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E
> {
   readonly string: <N1 extends string, K1, Q1, W1, X1, I1, S1, R1>(
      _: Config<IC, F, C, unknown, N, K, Q, W, X, I, S, R, E, string, N1, K1, Q1, W1, X1, I1, S1, R1, StringConfig>
   ) => InterpreterHKT<
      IURI,
      F,
      C,
      unknown,
      HKT.Mix<C, "N", [N, N1]>,
      HKT.Mix<C, "K", [K, K1]>,
      HKT.Mix<C, "Q", [Q, Q1]>,
      HKT.Mix<C, "W", [W, W1]>,
      HKT.Mix<C, "X", [X, X1]>,
      HKT.Mix<C, "I", [I, I1]>,
      HKT.Mix<C, "S", [S, S1]>,
      HKT.Mix<C, "R", [R, R1]>,
      E,
      string
   >;
}

interface A1<
   IURI,
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A extends I0
> extends InferredAlgebra<IURI, "P1", F, C, I0, N, K, Q, W, X, I, S, R, E, A> {}

declare module "./HKT" {
   interface URItoInterpreter<IC, F, C, I0, N, K, Q, W, X, I, S, R, E, A> {
      ["Decoder"]: KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>;
      ["Guard"]: Guard<I0, A>;
   }
   interface URItoAlgebra<IURI, IC, F, C, I0, N, K, Q, W, X, I, S, R, E, A> {
      ["Primitives"]: Primitives<IURI, IC, F, C, N, K, Q, W, X, I, S, R, E>;
   }
   interface URItoAlgebraHKT<IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A> {
      ["Primitives"]: PrimitivesHKT<IURI, HKT.Auto, F, C, N, K, Q, W, X, I, S, R, E>;
   }
   interface URItoProgramAlgebra {
      ["P1"]: ["Primitives"];
   }
   interface ProgramAlgebra<IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A> {
      ["P1"]: A1<IURI, F, C, I0, N, K, Q, W, X, I, S, R, E, A>;
   }
   interface URItoProgram<I0, N, K, Q, W, X, I, S, R, E, A> {
      ["P1"]: InferredProgram<"P1", I0, N, K, Q, W, X, I, S, R, E, A>;
   }
}

const decoderApplyConfig = getApplyConfig("Decoder");
const guardApplyConfig = getApplyConfig("Guard");

const decoder = implementInterpreter<["Primitives"], "Decoder", string>()((_) => (M) => ({
   string: (config) =>
      decoderApplyConfig(config)(
         fromRefinement(M)(string.is, (i) => `${i} is not a string`),
         {}
      )
}));

const guard = implementInterpreter<["Primitives"], "Guard", string>()((_) => (__) => ({
   string: (config) => guardApplyConfig(config)(string, {})
}));

const M: MonadFail<[T.URI], T.V & HKT.Fix<"E", string>> = T.MonadFail as any;

const a = decoder(M);
const g = guard(M);

const b = a.string({
   Decoder: (a) => ({
      decode: (u) =>
         pipe(
            a.decode(u),
            T.chain((s) => T.asks((_: { b: string }) => _.b + s))
         )
   })
});

declare const summon: Summoner<"P1", "Decoder" | "Guard">;

const L = summon((F) => F.string({}));
