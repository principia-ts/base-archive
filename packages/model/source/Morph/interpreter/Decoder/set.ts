import * as A from "@principia/core/Array";
import { flow, pipe } from "@principia/core/Function";
import * as S from "@principia/core/Set";

import * as DE from "../../../DecodeError";
import { M } from "../../../Decoder";
import * as D from "../../../Decoder";
import * as FS from "../../../FreeSemigroup";
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
