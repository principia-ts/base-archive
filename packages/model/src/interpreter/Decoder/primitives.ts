import type * as Alg from "../../algebra";
import type { URI } from "./HKT";
import type { Branded } from "@principia/base/data/Brand";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { pipe } from "@principia/base/data/Function";
import * as DE from "@principia/decoders/DecodeError";
import * as D from "@principia/decoders/Decoder";
import * as FS from "@principia/free/FreeSemigroup";

import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PrimitivesDecoder = implementInterpreter<URI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) =>
    applyDecoderConfig(config?.config)((M) => D.string(M)(extractInfo(config)), env, {}),
  number: (config) => (env) =>
    applyDecoderConfig(config?.config)((M) => D.number(M)(extractInfo(config)), env, {}),
  boolean: (config) => (env) =>
    applyDecoderConfig(config?.config)((M) => D.boolean(M)(extractInfo(config)), env, {}),
  literal: (...values) => (config) => (env) =>
    applyDecoderConfig(config?.config)(
      (M) => D.literal(M)(...values)(extractInfo(config)),
      env,
      {}
    ),
  stringLiteral: (value, config) => (env) =>
    applyDecoderConfig(config?.config)((M) => D.literal(M)(value)(extractInfo(config)), env, {}),
  numberLiteral: (value, config) => (env) =>
    applyDecoderConfig(config?.config)((M) => D.literal(M)(value)(extractInfo(config)), env, {}),
  bigint: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      (M) =>
        pipe(
          D.string(M)(),
          D.parse(M)((a) => {
            try {
              return M.pure(BigInt(a));
            } catch (e) {
              return M.fail(
                FS.combine(
                  FS.element(DE.leaf(a, "integer string")),
                  pipe(config, extractInfo, DE.info, FS.element)
                )
              );
            }
          })
        ),
      env,
      {}
    ),
  date: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      (M) =>
        pipe(
          D.string(M)(),
          D.mapLeftWithInput(M)((i, _) =>
            FS.combine(
              FS.element(DE.leaf(i, "date string")),
              pipe(config, extractInfo, DE.info, FS.element)
            )
          ),
          D.parse(M)((a) => {
            const d = new Date(a);
            return isNaN(d.getTime())
              ? M.fail(
                  FS.combine(
                    FS.element(DE.leaf(a, "date string")),
                    pipe(config, extractInfo, DE.info, FS.element)
                  )
                )
              : M.pure(d);
          })
        ),
      env,
      {}
    ),
  array: (item, config) => (env) =>
    pipe(item(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) => D.array(M)(decoder(M), extractInfo(config)),
        env,
        decoder
      )
    ),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) => pipe(D.array(M)(decoder(M)), D.refine(M)(A.isNonEmpty, "NonEmptyArray")),
        env,
        decoder
      )
    ),
  keyof: (keys, config) => (env) =>
    applyDecoderConfig(config?.config)(
      (M) =>
        pipe(
          D.string(M)(),
          D.refine(M)(
            (a): a is keyof typeof keys & string => Object.keys(keys).indexOf(a) !== -1,
            Object.keys(keys).join(" | ")
          )
        ),
      env,
      {}
    ),
  UUID: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      (M) =>
        pipe(
          D.string(M)(),
          D.refine(M)(
            (a): a is Branded<string, Alg.UUIDBrand> => regexUUID.test(a),
            "UUID",
            extractInfo(config)
          )
        ),
      env,
      {}
    )
}));
