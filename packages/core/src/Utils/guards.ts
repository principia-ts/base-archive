import type { Either } from "../Either";
import type { Tag } from "../Has";
import type { Option } from "../Option";
import type { Sync } from "../Sync";
import { Managed } from "../Task/Managed/model";
import type { XPure } from "../XPure";

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

export const isXPure = (u: unknown): u is XPure<unknown, unknown, unknown, unknown, unknown> =>
  typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "XPure";

export const isSync = (u: unknown): u is Sync<unknown, unknown, unknown> => isXPure(u);

export const isManaged = <R, E, A>(u: unknown): u is Managed<R, E, A> => u instanceof Managed;
