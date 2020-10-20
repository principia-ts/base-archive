import { pipe } from "@principia/core/Function";

import * as DE from "../../../DecodeError";
import * as D from "../../../Decoder";
import * as FS from "../../../FreeSemigroup";
import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { projectWithEnv } from "../../utils";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const ObjectDecoder = implementInterpreter<D.URI, Alg.ObjectURI>()((_) => ({
   type: (properties, config) => (env) =>
      pipe(projectWithEnv(properties, env), (decoders) =>
         applyDecoderConfig(config?.config)(D.type(decoders, extractInfo(config)) as any, env, decoders as any)
      ),
   partial: (properties, config) => (env) =>
      pipe(projectWithEnv(properties, env), (decoders) =>
         applyDecoderConfig(config?.config)(D.partial(decoders, extractInfo(config)) as any, env, decoders as any)
      ),
   both: (required, optional, config) => (env) =>
      pipe(projectWithEnv(required, env), (r) =>
         pipe(projectWithEnv(optional, env), (p) =>
            applyDecoderConfig(config?.config)(pipe(D.type(r), D.intersect(D.partial(p))) as any, env, {
               required: r as any,
               optional: p as any
            })
         )
      )
}));
