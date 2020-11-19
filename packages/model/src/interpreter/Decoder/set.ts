import * as A from "@principia/core/Array";
import * as DE from "@principia/core/DecodeError";
import * as D from "@principia/core/Decoder";
import * as FS from "@principia/core/FreeSemigroup";
import { flow, pipe } from "@principia/core/Function";
import * as S from "@principia/core/Set";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const SetDecoder = implementInterpreter<URI, Alg.SetURI>()((_) => ({
  set: (a, O, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) =>
          pipe(
            D.UnknownArray(M)(),
            D.mapLeftWithInput(M)((i, e) => FS.combine(e, DE.error(i, "Set", extractInfo(config)))),
            D.parse(M)(flow(A.traverse(M)(decoder(M).decode))),
            D.map(M)(S.fromArray(O))
          ),
        env,
        decoder
      )
    )
}));
