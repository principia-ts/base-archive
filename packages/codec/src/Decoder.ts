import type { DecodeErrors, ErrorInfo } from "./DecodeErrors";
import type { Refinement } from "@principia/base/data/Function";
import type { Guard } from "@principia/base/data/Guard";
import type { Integer } from "@principia/base/data/Integer";
import type * as O from "@principia/base/data/Option";
import type * as HKT from "@principia/base/HKT";
import type * as P from "@principia/base/typeclass";
import type { Literal, UnionToIntersection } from "@principia/base/util/types";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";
import * as G from "@principia/base/data/Guard";
import * as R from "@principia/base/data/Record";
import * as FS from "@principia/free/FreeSemigroup";

import * as DE from "./DecodeError";
import { error } from "./DecodeErrors";
import * as K from "./KleisliDecoder";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type V<C> = HKT.CleanParam<C, "E"> & HKT.Fix<"E", DecodeErrors>;

export interface Decoder<F extends HKT.URIS, C, I, O>
  extends K.KleisliDecoder<F, V<C>, I, DecodeErrors, O> {
  readonly _meta: {
    readonly name: string;
  };
}

export type InputOf<M extends HKT.URIS, D> = K.InputOf<M, D>;

export type TypeOf<M extends HKT.URIS, D> = K.TypeOf<M, D>;

export interface DecoderHKT<F, I, O> {
  readonly decode: (i: I) => HKT.HKT2<F, DecodeErrors, O>;
  readonly _meta: {
    readonly name: string;
  };
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function fromRefinement<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <I, A extends I>(
  refinement: Refinement<I, A>,
  expected: string,
  info?: ErrorInfo
) => Decoder<M, C, I, A> {
  return (refinement, expected, info) => ({
    decode: K.fromRefinement(M)(refinement, (i) => error(i, expected, info)).decode,
    _meta: {
      name: expected
    }
  });
}

export function fromGuard<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <I, A extends I>(guard: Guard<I, A>, expected: string, info?: ErrorInfo) => Decoder<M, C, I, A> {
  return (guard, expected, info) => fromRefinement(M)(guard.is, expected, info);
}

export function literal<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <A extends readonly [Literal, ...Array<Literal>]>(
  ...values: A
) => (info?: ErrorInfo) => Decoder<M, C, unknown, A[number]> {
  return (...values) => {
    const name = values.map((value) => JSON.stringify(value)).join(" | ");
    return (info) => ({
      decode: K.literal(M)((u, _) => error(u, name, info))(...values).decode,
      _meta: {
        name
      }
    });
  };
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export function string<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, string> {
  return (info) => fromGuard(M)(G.string, "string", info);
}

export function number<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, number> {
  return (info) => fromGuard(M)(G.number, "number", info);
}

export function integer<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, Integer> {
  return (info) => fromGuard(M)(G.safeInteger, "integer", info);
}

export function boolean<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, boolean> {
  return (info) => fromGuard(M)(G.boolean, "boolean", info);
}

export function UnknownArray<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, ReadonlyArray<unknown>> {
  return (info) => fromGuard(M)(G.UnknownArray, "Array<unknown>", info);
}

export function UnknownRecord<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): (info?: ErrorInfo) => Decoder<M, C, unknown, Readonly<Record<string, unknown>>> {
  return (info) => fromGuard(M)(G.UnknownRecord, "Record<string, unknown>", info);
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export function alt_<F extends HKT.URIS, C>(
  A: P.Alt<F, V<C>>
): <I, A>(me: Decoder<F, C, I, A>, that: () => Decoder<F, C, I, A>) => Decoder<F, C, I, A> {
  return (me, that) => ({
    decode: K.alt_(A)(me, that).decode,
    _meta: {
      name: `${me._meta.name} <!> ${that()._meta.name}`
    }
  });
}

export function alt<F extends HKT.URIS, C>(
  A: P.Alt<F, V<C>>
): <I, A>(that: () => Decoder<F, C, I, A>) => (me: Decoder<F, C, I, A>) => Decoder<F, C, I, A> {
  return (that) => (me) => alt_(A)(me, that);
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<M extends HKT.URIS, C>(
  M: P.Monad<M, V<C>>
): <I, A, B>(from: Decoder<M, C, I, A>, to: Decoder<M, C, A, B>) => Decoder<M, C, I, B> {
  return (from, to) => ({
    decode: K.compose_(M)(from, to).decode,
    _meta: {
      name: `(${from._meta.name} >>> ${to._meta.name})`
    }
  });
}

export function compose<M extends HKT.URIS, C>(
  M: P.Monad<M, V<C>>
): <A, B>(to: Decoder<M, C, A, B>) => <I>(from: Decoder<M, C, I, A>) => Decoder<M, C, I, B> {
  return (to) => (from) => compose_(M)(from, to);
}

export function id<M extends HKT.URIS, C>(M: P.Applicative<M, V<C>>): <A>() => Decoder<M, C, A, A> {
  return () => ({
    decode: M.pure,
    _meta: {
      name: "id"
    }
  });
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<F extends HKT.URIS, C>(
  F: P.Functor<F, V<C>>
): <I, A, B>(ia: Decoder<F, C, I, A>, f: (a: A) => B) => Decoder<F, C, I, B> {
  return (ia, f) => ({
    decode: (i) => F.map_(ia.decode(i), f),
    _meta: {
      name: ia._meta.name
    }
  });
}

export function map<F extends HKT.URIS, C>(
  F: P.Functor<F, V<C>>
): <A, B>(f: (a: A) => B) => <I>(ia: Decoder<F, C, I, A>) => Decoder<F, C, I, B> {
  return (f) => (ia) => map_(F)(ia, f);
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function mapLeftWithInput_<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): <I, A>(
  decoder: Decoder<M, C, I, A>,
  f: (input: I, e: DecodeErrors) => DecodeErrors
) => Decoder<M, C, I, A> {
  return (decoder, f) => ({
    decode: K.mapLeftWithInput_(M)(decoder, f).decode,
    _meta: {
      name: decoder._meta.name
    }
  });
}

export function mapLeftWithInput<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): <I>(
  f: (input: I, e: DecodeErrors) => DecodeErrors
) => <A>(decoder: Decoder<M, C, I, A>) => Decoder<M, C, I, A> {
  return (f) => (decoder) => mapLeftWithInput_(M)(decoder, f);
}

export function withMessage<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): <I>(
  message: (input: I, e: DecodeErrors) => string
) => <A>(decoder: Decoder<M, C, I, A>) => Decoder<M, C, I, A> {
  return (message) =>
    mapLeftWithInput(M)((input, e) => FS.element(DE.wrap({ message: message(input, e) }, e)));
}

export function wrapInfo<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): (info: ErrorInfo | undefined) => <I, A>(decoder: Decoder<M, C, I, A>) => Decoder<M, C, I, A> {
  return (info) => (decoder) =>
    info ? mapLeftWithInput_(M)(decoder, (_, e) => FS.element(DE.wrap(info, e))) : decoder;
}

export function refine<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <A, B extends A>(
  refinement: Refinement<A, B>,
  name: string,
  info?: ErrorInfo
) => <I>(from: Decoder<M, C, I, A>) => Decoder<M, C, I, B> {
  return (refinement, name, info) => (from) => ({
    decode: K.refine_(M)(from, refinement, (a) => error(a, name, info)).decode,
    _meta: {
      name
    }
  });
}

export function parse_<M extends HKT.URIS, C>(
  M: P.Monad<M, V<C>>
): <I, A, B>(
  from: Decoder<M, C, I, A>,
  decode: (
    a: A
  ) => HKT.Kind<
    M,
    C,
    HKT.Initial<C, "N">,
    HKT.Initial<C, "K">,
    HKT.Initial<C, "Q">,
    HKT.Initial<C, "W">,
    HKT.Initial<C, "X">,
    HKT.Initial<C, "I">,
    HKT.Initial<C, "S">,
    HKT.Initial<C, "R">,
    DecodeErrors,
    B
  >,
  name?: string
) => Decoder<M, C, I, B> {
  return (from, decode, name) => ({
    decode: K.parse_(M)(from, decode).decode,
    _meta: {
      name: name ?? from._meta.name
    }
  });
}

export function parse<M extends HKT.URIS, C>(
  M: P.Monad<M, V<C>>
): <A, B>(
  decode: (
    a: A
  ) => HKT.Kind<
    M,
    C,
    HKT.Initial<C, "N">,
    HKT.Initial<C, "K">,
    HKT.Initial<C, "Q">,
    HKT.Initial<C, "W">,
    HKT.Initial<C, "X">,
    HKT.Initial<C, "I">,
    HKT.Initial<C, "S">,
    HKT.Initial<C, "R">,
    DecodeErrors,
    B
  >,
  name?: string
) => <I>(from: Decoder<M, C, I, A>) => Decoder<M, C, I, B> {
  return (decode, name) => (from) => parse_(M)(from, decode, name);
}

export function nullable<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): (
  info?: ErrorInfo
) => <I, A>(or: Decoder<M, C, I, A>) => Decoder<M, C, I | null | undefined, A | null> {
  return (info) => (or) => ({
    decode: K.nullable_(M)(or, (u, e) =>
      FS.combine(
        FS.element(DE.member(0, error(u, "null | undefined", info))),
        FS.element(DE.member(1, e))
      )
    ).decode,
    _meta: {
      name: `${or._meta.name} | null | undefined`
    }
  });
}

export function optional<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): (
  info?: ErrorInfo
) => <I, A>(or: Decoder<M, C, I, A>) => Decoder<M, C, I | null | undefined, O.Option<A>> {
  return (info) => (or) => ({
    decode: K.optional_(M)(or, (u, e) =>
      FS.combine(
        FS.element(DE.member(0, error(u, "null | undefined", info))),
        FS.element(DE.member(1, e))
      )
    ).decode,
    _meta: {
      name: `${or._meta.name} | null | undefined`
    }
  });
}

export function fromType<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <P extends Record<string, Decoder<M, C, any, any>>>(
  properties: P,
  info?: ErrorInfo
) => Decoder<M, C, { [K in keyof P]: InputOf<M, P[K]> }, { [K in keyof P]: TypeOf<M, P[K]> }> {
  return (properties, info) => {
    const name: string = pipe(
      properties,
      R.foldLeftWithIndex([] as string[], (b, k, a) => [...b, `${k}: ${a._meta.name}`]),
      (as) => `{ ${as.join(", ")} }`
    );
    return pipe(
      {
        decode: K.fromType_(M)(properties, (k, e) => FS.element(DE.key(k, DE.required, e))).decode,
        _meta: {
          name
        }
      },
      wrapInfo(M)({ name, ...info })
    ) as any;
  };
}

export function type<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <P extends Record<string, Decoder<M, C, any, any>>>(
  properties: P,
  info?: ErrorInfo
) => Decoder<M, C, unknown, { [K in keyof P]: TypeOf<M, P[K]> }> {
  return (properties, info) =>
    compose_(M)(UnknownRecord(M)(info) as any, fromType(M)(properties, info));
}

export function fromPartial<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <P extends Record<string, Decoder<M, C, any, any>>>(
  properties: P,
  info?: ErrorInfo
) => Decoder<
  M,
  C,
  Partial<{ [K in keyof P]: InputOf<M, P[K]> }>,
  Partial<{ [K in keyof P]: TypeOf<M, P[K]> }>
> {
  return (properties, info) => {
    const name: string = pipe(
      properties,
      R.foldLeftWithIndex([] as string[], (b, k, a) => [...b, `${k}?: ${a._meta.name}`]),
      (as) => `{ ${as.join(", ")} }`
    );
    return pipe(
      {
        decode: K.fromPartial_(M)(properties, (k, e) => FS.element(DE.key(k, DE.optional, e)))
          .decode,
        _meta: {
          name
        }
      },
      wrapInfo(M)({ name, ...info })
    ) as any;
  };
}

export function partial<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <P extends Record<string, Decoder<M, C, any, any>>>(
  properties: P,
  info?: ErrorInfo
) => Decoder<
  M,
  C,
  unknown,
  Partial<
    {
      [K in keyof P]: TypeOf<M, P[K]>;
    }
  >
> {
  return (properties, info) =>
    compose_(M)(UnknownRecord(M)(info) as any, fromPartial(M)(properties, info));
}

export function fromArray<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <I, A>(
  item: Decoder<M, C, I, A>,
  info?: ErrorInfo
) => Decoder<M, C, ReadonlyArray<I>, ReadonlyArray<A>> {
  return (item, info) => {
    const name = `Array<${item._meta.name}>`;
    return pipe(
      {
        decode: K.fromArray_(M)(item, (i, e) => FS.element(DE.index(i, DE.optional, e))).decode,
        _meta: { name }
      },
      wrapInfo(M)({ name, ...info })
    );
  };
}

export function array<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <A>(
  item: Decoder<M, C, unknown, A>,
  info?: ErrorInfo
) => Decoder<M, C, unknown, ReadonlyArray<A>> {
  return (item, info) => compose_(M)(UnknownArray(M)(info), fromArray(M)(item, info));
}

export function fromRecord<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <I, A>(
  codomain: Decoder<M, C, I, A>,
  info?: ErrorInfo
) => Decoder<M, C, R.ReadonlyRecord<string, I>, R.ReadonlyRecord<string, A>> {
  return (codomain, info) => {
    const name = `Record<string, ${codomain._meta.name}>`;
    return pipe(
      {
        decode: K.fromRecord_(M)(codomain, (k, e) => FS.element(DE.key(k, DE.optional, e))).decode,
        _meta: { name }
      },
      wrapInfo(M)({ name, ...info })
    );
  };
}

export function record<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <A>(
  codomain: Decoder<M, C, unknown, A>,
  info?: ErrorInfo
) => Decoder<M, C, unknown, R.ReadonlyRecord<string, A>> {
  return (codomain, info) => compose_(M)(UnknownRecord(M)(info), fromRecord(M)(codomain, info));
}

export function fromTuple<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <A extends ReadonlyArray<Decoder<M, C, any, any>>>(
  ...components: A
) => (
  info?: ErrorInfo
) => Decoder<
  M,
  C,
  [...{ [K in keyof A]: InputOf<M, A[K]> }],
  [...{ [K in keyof A]: TypeOf<M, A[K]> }]
> {
  return (...components) => (info) => {
    const name: string = pipe(
      components,
      A.map((d) => d._meta.name),
      (as) => `[${as.join(", ")}]`
    );
    return pipe(
      {
        decode: K.fromTuple(M)((i, e) => FS.element(DE.index(i, DE.required, e)))(...components)
          .decode,
        _meta: { name }
      },
      wrapInfo(M)({ name, ...info })
    ) as any;
  };
}

export function tuple<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <A extends ReadonlyArray<Decoder<M, C, any, any>>>(
  ...components: A
) => (info?: ErrorInfo) => Decoder<M, C, unknown, [...{ [K in keyof A]: TypeOf<M, A[K]> }]> {
  return (...components) => (info) =>
    compose_(M)(UnknownArray(M)(info) as any, fromTuple(M)(...components)(info));
}

export function union<M extends HKT.URIS, C>(
  M: P.Alt<M, V<C>> & P.Bifunctor<M, C>
): (
  info?: ErrorInfo
) => <P extends readonly [Decoder<M, C, any, any>, ...ReadonlyArray<Decoder<M, C, any, any>>]>(
  ...members: P
) => Decoder<M, C, InputOf<M, P[keyof P]>, TypeOf<M, P[keyof P]>> {
  return (info) => (...members) => {
    const name = members.join(" | ");
    return pipe(
      {
        decode: K.union(M)((i, e) => FS.element(DE.member(i, e)))(...members).decode,
        _meta: { name }
      },
      wrapInfo(M)({ name, ...info })
    ) as any;
  };
}

export function intersect_<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <IA, A, IB, B>(
  left: Decoder<M, C, IA, A>,
  right: Decoder<M, C, IB, B>,
  info?: ErrorInfo
) => Decoder<M, C, IA & IB, A & B> {
  return (left, right, info) =>
    pipe(
      {
        decode: K.intersect_(M as P.Applicative<M, V<C>>)(left, right).decode,
        _meta: {
          name: info?.name ?? `${left._meta.name} & ${right._meta.name}`
        }
      },
      wrapInfo(M)({ name: info?.name ?? `${left._meta.name} & ${right._meta.name}` })
    );
}

export function intersect<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <IB, B>(
  right: Decoder<M, C, IB, B>,
  info?: ErrorInfo
) => <IA, A>(left: Decoder<M, C, IA, A>) => Decoder<M, C, IA & IB, A & B> {
  return (right, info) => (left) => intersect_(M)(left, right, info);
}

export function intersectAll<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <
  A extends readonly [
    Decoder<M, C, any, any>,
    Decoder<M, C, any, any>,
    ...(readonly Decoder<M, C, any, any>[])
  ]
>(
  decoders: A,
  info?: ErrorInfo
) => Decoder<
  M,
  C,
  UnionToIntersection<{ [K in keyof A]: InputOf<M, A[K]> }[keyof A]>,
  UnionToIntersection<{ [K in keyof A]: TypeOf<M, A[K]> }[keyof A]>
> {
  return (decoders, info) => {
    const [left, right, ...rest] = decoders;
    const decoder = A.foldLeft_(
      rest,
      K.intersect_(M as P.Applicative<M, V<C>>)(left, right),
      (b, a) => K.intersect_(M as P.Applicative<M, V<C>>)(b, a)
    );
    const name = info?.name ?? A.map_(decoders, (d) => d._meta.name).join(" & ");
    return pipe({ decode: decoder.decode, _meta: { name } }, wrapInfo(M)({ name, ...info }) as any);
  };
}

export function fromSum_<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Bifunctor<M, C>
): <T extends string, P extends Record<string, Decoder<M, C, any, any>>>(
  tag: T,
  members: P,
  info?: ErrorInfo
) => Decoder<M, C, InputOf<M, P[keyof P]>, TypeOf<M, P[keyof P]>> {
  return (tag, members, info) => {
    const name: string = pipe(
      members,
      R.foldLeft([] as string[], (b, a) => [...b, a._meta.name]),
      (as) => as.join(" | ")
    );

    const decode = K.sum_(M as P.MonadFail<M, V<C>>)(tag, members, (tag, value, keys) =>
      FS.element(
        DE.key(
          tag,
          DE.required,
          error(value, keys.length === 0 ? "never" : keys.map((k) => JSON.stringify(k)).join(" | "))
        )
      )
    ).decode;

    return pipe({ decode, _meta: { name } }, wrapInfo(M)({ name, ...info }));
  };
}

export function fromSum<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Bifunctor<M, C>
): <T extends string>(
  tag: T,
  info?: ErrorInfo
) => <P extends Record<string, Decoder<M, C, any, any>>>(
  members: P
) => Decoder<M, C, InputOf<M, P[keyof P]>, TypeOf<M, P[keyof P]>> {
  return (tag, info) => (members) => fromSum_(M)(tag, members, info);
}

export function sum_<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Bifunctor<M, C>
): <T extends string, P extends Record<string, Decoder<M, C, any, any>>>(
  tag: T,
  members: P,
  info?: ErrorInfo
) => Decoder<M, C, unknown, TypeOf<M, P[keyof P]>> {
  return (tag, members, info) =>
    compose_(M)(UnknownRecord(M)(info) as any, fromSum_(M)(tag, members, info) as any);
}

export function sum<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Bifunctor<M, C>
): <T extends string>(
  tag: T,
  info?: ErrorInfo
) => <P extends Record<string, Decoder<M, C, any, any>>>(
  members: P
) => Decoder<M, C, unknown, TypeOf<M, P[keyof P]>> {
  return (tag, info) => (members) => sum_(M)(tag, members, info);
}

export function lazy<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): <I, A>(id: string, f: () => Decoder<M, C, I, A>, info?: ErrorInfo) => Decoder<M, C, I, A> {
  return (id, f, info) =>
    pipe(
      {
        decode: K.lazy_(M)(id, f, (id, e) => FS.element(DE.lazy(id, e))).decode,
        _meta: {
          name: info?.name ?? id
        }
      },
      wrapInfo(M)({ name: id, ...info })
    );
}
