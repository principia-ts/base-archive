import * as A from "@principia/core/Array";
import { M } from "@principia/core/Decoder";
import * as D from "@principia/core/Decoder";
import * as FS from "@principia/core/FreeSemigroup";
import { flow, pipe } from "@principia/core/Function";
import * as S from "@principia/core/Set";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const SetDecoder = implementInterpreter<D.URI, Alg.SetURI>()((_) => ({
   set: (a, O, config) => (env) =>
      pipe(a(env), (decoder) =>
         applyDecoderConfig(config?.config)(
            pipe(
               D.UnknownArray(),
               D.mapLeftWithInput((i, e) => FS.combine(e, D.error(i, "Set", extractInfo(config)))),
               D.parse(flow(A.traverse(M)(decoder.decode))),
               D.map(S.fromArray(O))
            ),
            env,
            decoder
         )
      )
}));
