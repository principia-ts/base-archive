import { Managed } from "../AIO/Managed/model";
import type { Either } from "../Either";
import type { Tag } from "../Has";
import type { Option } from "../Option";
import type { SIO } from "../SIO";
import type { Sync } from "../Sync";

export const isEither = (u: unknown): u is Either<unknown, unknown> =>
  typeof u === "object" &&
  u != null &&
  "_tag" in u &&
  (u["_tag"] === "Left" || u["_tag"] === "Right");

export const isOption = (u: unknown): u is Option<unknown> =>
  typeof u === "object" &&
  u != null &&
  "_tag" in u &&
  (u["_tag"] === "Some" || u["_tag"] === "None");

export const isTag = (u: unknown): u is Tag<unknown> =>
  typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "Tag";

export const isSIO = (u: unknown): u is SIO<unknown, unknown, unknown, unknown, unknown> =>
  typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "SIO";

export const isSync = (u: unknown): u is Sync<unknown, unknown, unknown> => isSIO(u);

export const isManaged = <R, E, A>(u: unknown): u is Managed<R, E, A> => u instanceof Managed;
