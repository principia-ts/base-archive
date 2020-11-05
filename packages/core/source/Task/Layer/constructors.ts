import type { UnionToIntersection } from "@principia/prelude/Utils";

import { identity } from "../../Function";
import type { Has, Tag } from "../../Has";
import * as M from "../Managed";
import type { Task } from "../Task";
import * as T from "../Task/combinators/service";
import * as L from "./core";

export const fromConstructor = <S>(tag: Tag<S>) => <Services extends any[]>(
   constructor: (...services: Services) => S
) => (
   ...tags: { [k in keyof Services]: Tag<Services[k]> }
): L.Layer<UnionToIntersection<{ [k in keyof Services]: Has<Services[k]> }[keyof Services & number]>, never, Has<S>> =>
   L.fromTask(tag)(T.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as any) as any;

export const fromTaskConstructor = <S>(tag: Tag<S>) => <Services extends any[], R, E>(
   constructor: (...services: Services) => Task<R, E, S>
) => (
   ...tags: { [k in keyof Services]: Tag<Services[k]> }
): L.Layer<UnionToIntersection<{ [k in keyof Services]: Has<Services[k]> }[keyof Services & number]> & R, E, Has<S>> =>
   L.fromTask(tag)(T.asksServicesTM(...tags)((...services: any[]) => constructor(...(services as any))) as any) as any;

export const fromManagedConstructor = <S>(tag: Tag<S>) => <Services extends any[], R, E>(
   constructor: (...services: Services) => M.Managed<R, E, S>
) => (
   ...tags: { [k in keyof Services]: Tag<Services[k]> }
): L.Layer<UnionToIntersection<{ [k in keyof Services]: Has<Services[k]> }[keyof Services & number]> & R, E, Has<S>> =>
   L.fromManaged(tag)(
      M.chain_(
         M.fromTask(T.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any)))),
         identity
      )
   );

export const bracketConstructor = <S>(tag: Tag<S>) => <Services extends any[], S2 extends S>(
   constructor: (...services: Services) => S2
) => (...tags: { [k in keyof Services]: Tag<Services[k]> }) => <R, R2, E>(
   open: (s: S2) => Task<R, E, unknown>,
   release: (s: S2) => Task<R2, never, unknown>
): L.Layer<
   UnionToIntersection<{ [k in keyof Services]: Has<Services[k]> }[keyof Services & number]> & R & R2,
   E,
   Has<S>
> =>
   L.prepare(tag)(T.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as any)
      .open(open as any)
      .release(release as any) as any;

export const bracketTaskConstructor = <S>(tag: Tag<S>) => <Services extends any[], S2 extends S, R0, E0>(
   constructor: (...services: Services) => Task<R0, E0, S2>
) => (...tags: { [k in keyof Services]: Tag<Services[k]> }) => <R, R2, E>(
   open: (s: S2) => Task<R, E, unknown>,
   release: (s: S2) => Task<R2, never, unknown>
): L.Layer<
   UnionToIntersection<{ [k in keyof Services]: Has<Services[k]> }[keyof Services & number]> & R & R2 & R0,
   E | E0,
   Has<S>
> =>
   L.prepare(tag)(T.asksServicesTM(...tags)((...services: any[]) => constructor(...(services as any))) as any)
      .open(open as any)
      .release(release as any) as any;

export const restrict = <Tags extends Tag<any>[]>(...ts: Tags) => <R, E>(
   layer: L.Layer<
      R,
      E,
      UnionToIntersection<
         {
            [k in keyof Tags]: [Tags[k]] extends [Tag<infer A>] ? Has<A> : never;
         }[number]
      >
   >
): L.Layer<
   R,
   E,
   UnionToIntersection<
      {
         [k in keyof Tags]: [Tags[k]] extends [Tag<infer A>] ? Has<A> : never;
      }[number]
   >
> =>
   L.andTo_(
      layer,
      L.fromRawTask(
         T.asksServicesT(...ts)((...servises) =>
            servises.map((s, i) => ({ [ts[i].key]: s } as any)).reduce((x, y) => ({ ...x, ...y }))
         )
      )
   ) as any;
