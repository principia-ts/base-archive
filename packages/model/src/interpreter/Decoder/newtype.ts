import * as DE from "@principia/core/DecodeError";
import * as D from "@principia/core/Decoder";
import * as E from "@principia/core/Either";
import * as FS from "@principia/core/FreeSemigroup";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import { pureF } from "@principia/prelude";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const NewtypeDecoder = implementInterpreter<URI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) =>
          pipe(
            decoder(M),
            D.map(M)(iso.get),
            D.mapLeftWithInput(M)((i, e) => FS.combine(e, FS.element(DE.info(extractInfo(config)))))
          ),
        env,
        decoder
      )
    ),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) =>
          pipe(
            decoder(M),
            D.parse(M)((a) =>
              O.fold_(
                prism.getOption(a),
                () =>
                  M.fail(
                    DE.error(a, "", {
                      message: "newtype does not satisfy prism conditions",
                      ...extractInfo(config)
                    })
                  ),
                (n) => pureF(M)(n)
              )
            )
          ),
        env,
        decoder
      )
    )
}));
