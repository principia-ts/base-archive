import type * as Alg from "../../algebra";
import type { URI } from "./HKT";

import * as A from "@principia/base/data/Array";
import { flow, pipe } from "@principia/base/data/Function";
import * as S from "@principia/base/data/Set";
import { error } from "@principia/decoders/DecodeErrors";
import * as D from "@principia/decoders/Decoder";
import * as FS from "@principia/free/FreeSemigroup";

import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const SetDecoder = implementInterpreter<URI, Alg.SetURI>()((_) => ({
  set: (a, O, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) =>
          pipe(
            D.UnknownArray(M)(),
            D.mapLeftWithInput(M)((i, e) => FS.combine(e, error(i, "Set", extractInfo(config)))),
            D.parse(M)(flow(A.traverse(M)(decoder(M).decode))),
            D.map(M)(S.fromArray(O))
          ),
        env,
        decoder
      )
    )
}));
