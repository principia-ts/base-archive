import type { Either } from "../../Either";
import type { Option } from "../../Option";
import type { XPure } from "../../XPure";
import type { Effect } from "../Effect";
import type { Tag } from "../Has";
import type { Managed } from "../Managed";

export type _A<T> = [T] extends [{ ["_A"]: () => infer A }] ? A : never;

export type _R<T> = [T] extends [{ ["_R"]: (_: infer R) => void }] ? R : never;

export type _E<T> = [T] extends [{ ["_E"]: () => infer E }] ? E : never;

export const isEither = (u: unknown): u is Either<unknown, unknown> =>
   typeof u === "object" && u != null && "_tag" in u && (u["_tag"] === "Left" || u["_tag"] === "Right");

export const isOption = (u: unknown): u is Option<unknown> =>
   typeof u === "object" && u != null && "_tag" in u && (u["_tag"] === "Some" || u["_tag"] === "None");

export const isTag = (u: unknown): u is Tag<unknown> =>
   typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "Tag";

export const isXPure = (u: unknown): u is XPure<unknown, unknown, unknown, unknown, unknown> =>
   typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "XPure";

export const isManaged = <R, E, A>(u: Effect<R, E, A> | Managed<R, E, A>): u is Managed<R, E, A> => "effect" in u;
