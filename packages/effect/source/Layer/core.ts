import * as A from "@principia/core/Array";
import { tuple } from "@principia/core/Function";
import { Erase, UnionToIntersection } from "@principia/core/Utils";

import * as T from "../Effect/core";
import * as H from "../Has";
import { Has, mergeEnvironments } from "../Has";
import type { Managed } from "../Managed/Managed";
import * as M from "../Managed/core";
import type { Layer } from "./Layer";

export type RIO<R, A> = Layer<R, never, A>;

export const layer = <R, E, A>(build: Managed<R, E, A>): Layer<R, E, A> => ({
   build
});

export const pure = <T>(has: H.Tag<T>) => (resource: T) =>
   layer<unknown, never, Has<T>>(
      M._chain(M.fromEffect(T.pure(resource)), (a) => environmentFor(has, a))
   );

export const prepare = <T>(has: H.Tag<T>) => <R, E, A extends T>(acquire: T.Effect<R, E, A>) => ({
   open: <S1, R1, E1>(open: (_: A) => T.Effect<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => T.Effect<R2, never, any>) =>
         fromManaged(has)(
            M._chain(
               M._makeExit(acquire, (a) => release(a)),
               (a) => M.fromEffect(T._map(open(a), () => a))
            )
         )
   }),
   release: <R2>(release: (_: A) => T.Effect<R2, never, any>) =>
      fromManaged(has)(M._makeExit(acquire, (a) => release(a)))
});

export const create = <T>(has: H.Tag<T>) => ({
   fromEffect: fromEffect(has),
   fromManaged: fromManaged(has),
   pure: pure(has),
   prepare: prepare(has)
});

export const fromEffect = <T>(has: H.Tag<T>) => <R, E>(resource: T.Effect<R, E, T>) =>
   layer<R, E, H.Has<T>>(M._chain(M.fromEffect(resource), (a) => environmentFor(has, a)));

export const fromManaged = <T>(has: H.Tag<T>) => <R, E>(resource: Managed<R, E, T>) =>
   layer<R, E, H.Has<T>>(M._chain(resource, (a) => environmentFor(has, a)));

export const fromRawManaged = <R, E, A>(resource: Managed<R, E, A>) => layer<R, E, A>(resource);

export const fromRawEffect = <R, E, A>(resource: T.Effect<R, E, A>) =>
   layer<R, E, A>(M.fromEffect(resource));

export const _both = <R, E, A, R2, E2, A2>(left: Layer<R, E, A>, right: Layer<R2, E2, A2>) =>
   layer<R & R2, E | E2, readonly [A, A2]>(
      M._chain(left.build, (l) =>
         M._chain(right.build, (r) => M.fromEffect(T.total(() => tuple(l, r))))
      )
   );

export const both = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(left: Layer<R, E, A>) =>
   _both(left, right);

export const _merge = <R, E, A, S2, R2, E2, A2>(left: Layer<R, E, A>, right: Layer<R2, E2, A2>) =>
   layer<R & R2, E | E2, A & A2>(
      M._chain(left.build, (l) =>
         M._chain(right.build, (r) => M.fromEffect(T.total(() => ({ ...l, ...r }))))
      )
   );

export const merge = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(left: Layer<R, E, A>) =>
   _merge(left, right);

export const using = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(left: Layer<R, E, A>) =>
   _using<R, E, A, R2, E2, A2>(left, right);

export const _using = <R, E, A, R2, E2, A2>(left: Layer<R, E, A>, right: Layer<R2, E2, A2>) =>
   layer<Erase<R, A2> & R2, E | E2, A & A2>(
      M._chain(right.build, (a2) =>
         M._map(
            M._provideSome(left.build, (r0: R) => ({
               ...r0,
               ...a2
            })),
            (a) => ({ ...a2, ...a })
         )
      )
   );

export const consuming = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(
   left: Layer<R & A2, E, A>
) => _consuming<R, E, A, R2, E2, A2>(left, right);

export const _consuming = <R, E, A, R2, E2, A2>(
   left: Layer<R & A2, E, A>,
   right: Layer<R2, E2, A2>
) =>
   layer<R & R2, E | E2, A & A2>(
      M._chain(right.build, (a2) =>
         M._map(
            M._provideSome(left.build, (r0: R & R2) => ({
               ...r0,
               ...a2
            })),
            (a) => ({ ...a2, ...a })
         )
      )
   );

export const mergePar = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(left: Layer<R, E, A>) =>
   _mergePar(left, right);

export const _mergePar = <R, E, A, S2, R2, E2, A2>(
   left: Layer<R, E, A>,
   right: Layer<R2, E2, A2>
) =>
   layer<R & R2, E | E2, A & A2>(
      M._chain(
         M._mapBothPar(left.build, right.build, (a, b) => [a, b] as const),
         ([l, r]) => M.fromEffect(T.total(() => ({ ...l, ...r })))
      )
   );

export type MergeR<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
   {
      [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any>]
         ? unknown extends X
            ? never
            : X
         : never;
   }[number]
>;

export type MergeE<Ls extends Layer<any, any, any>[]> = {
   [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any>] ? X : never;
}[number];

export type MergeA<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
   {
      [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X>]
         ? unknown extends X
            ? never
            : X
         : never;
   }[number]
>;

export const all = <Ls extends Layer<any, any, any>[]>(
   ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
   layer(
      M._map(
         M._foreach(ls, (l) => l.build),
         (ps) => A._reduce(ps, {} as any, (b, a) => ({ ...b, ...a }))
      )
   );

export const allPar = <Ls extends Layer<any, any, any>[]>(
   ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
   layer(
      M._map(
         M._foreachPar(ls, (l) => l.build),
         (ps) => A._reduce(ps, {} as any, (b, a) => ({ ...b, ...a }))
      )
   );

export const allParN = (n: number) => <Ls extends Layer<any, any, any>[]>(
   ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
   layer(
      M._map(
         M._foreachParN(n)(ls, (l) => l.build),
         (ps) => A._reduce(ps, {} as any, (b, a) => ({ ...b, ...a }))
      )
   );

function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, Has<T>>;
function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, any> {
   return M.fromEffect(
      T.access((r) => ({
         [has.key]: mergeEnvironments(has, r, a as any)[has.key]
      }))
   );
}
