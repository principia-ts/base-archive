import type * as P from "@principia/prelude";
import { pipe } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as A from "../Array/_core";
import * as DE from "../DecodeError";
import * as FS from "../FreeSemigroup";
import * as K from "../KleisliDecoder";
import type { Option } from "../Option";
import type { ReadonlyRecord } from "../Record";
import * as R from "../Record";
import type { UnionToIntersection } from "../Utils";
import { compose_ } from "./category";
import type { Decoder, InputOf, TypeOf, V } from "./model";
import { UnknownArray, UnknownRecord } from "./primitives";

export function mapLeftWithInput_<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): <I, A>(
  decoder: Decoder<M, C, I, A>,
  f: (input: I, e: DE.DecodeErrors) => DE.DecodeErrors
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
  f: (input: I, e: DE.DecodeErrors) => DE.DecodeErrors
) => <A>(decoder: Decoder<M, C, I, A>) => Decoder<M, C, I, A> {
  return (f) => (decoder) => mapLeftWithInput_(M)(decoder, f);
}

export function withMessage<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): <I>(
  message: (input: I, e: DE.DecodeErrors) => string
) => <A>(decoder: Decoder<M, C, I, A>) => Decoder<M, C, I, A> {
  return (message) =>
    mapLeftWithInput(M)((input, e) => FS.element(DE.wrap({ message: message(input, e) }, e)));
}

export function wrapInfo<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): (info: DE.ErrorInfo | undefined) => <I, A>(decoder: Decoder<M, C, I, A>) => Decoder<M, C, I, A> {
  return (info) => (decoder) =>
    info ? mapLeftWithInput_(M)(decoder, (_, e) => FS.element(DE.wrap(info, e))) : decoder;
}

export function refine<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>>
): <A, B extends A>(
  refinement: P.Refinement<A, B>,
  name: string,
  info?: DE.ErrorInfo
) => <I>(from: Decoder<M, C, I, A>) => Decoder<M, C, I, B> {
  return (refinement, name, info) => (from) => ({
    decode: K.refine_(M)(from, refinement, (a) => DE.error(a, name, info)).decode,
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
    DE.DecodeErrors,
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
    DE.DecodeErrors,
    B
  >,
  name?: string
) => <I>(from: Decoder<M, C, I, A>) => Decoder<M, C, I, B> {
  return (decode, name) => (from) => parse_(M)(from, decode, name);
}

export function nullable<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): (
  info?: DE.ErrorInfo
) => <I, A>(or: Decoder<M, C, I, A>) => Decoder<M, C, I | null | undefined, A | null> {
  return (info) => (or) => ({
    decode: K.nullable_(M)(or, (u, e) =>
      FS.combine(
        FS.element(DE.member(0, DE.error(u, "null | undefined", info))),
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
  info?: DE.ErrorInfo
) => <I, A>(or: Decoder<M, C, I, A>) => Decoder<M, C, I | null | undefined, Option<A>> {
  return (info) => (or) => ({
    decode: K.optional_(M)(or, (u, e) =>
      FS.combine(
        FS.element(DE.member(0, DE.error(u, "null | undefined", info))),
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
  info?: DE.ErrorInfo
) => Decoder<M, C, { [K in keyof P]: InputOf<M, P[K]> }, { [K in keyof P]: TypeOf<M, P[K]> }> {
  return (properties, info) => {
    const name: string = pipe(
      properties,
      R.reduceWithIndex([] as string[], (k, b, a) => [...b, `${k}: ${a._meta.name}`]),
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
  info?: DE.ErrorInfo
) => Decoder<M, C, unknown, { [K in keyof P]: TypeOf<M, P[K]> }> {
  return (properties, info) =>
    compose_(M)(UnknownRecord(M)(info) as any, fromType(M)(properties, info));
}

export function fromPartial<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <P extends Record<string, Decoder<M, C, any, any>>>(
  properties: P,
  info?: DE.ErrorInfo
) => Decoder<
  M,
  C,
  Partial<{ [K in keyof P]: InputOf<M, P[K]> }>,
  Partial<{ [K in keyof P]: TypeOf<M, P[K]> }>
> {
  return (properties, info) => {
    const name: string = pipe(
      properties,
      R.reduceWithIndex([] as string[], (k, b, a) => [...b, `${k}?: ${a._meta.name}`]),
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
  info?: DE.ErrorInfo
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
  info?: DE.ErrorInfo
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
  info?: DE.ErrorInfo
) => Decoder<M, C, unknown, ReadonlyArray<A>> {
  return (item, info) => compose_(M)(UnknownArray(M)(info), fromArray(M)(item, info));
}

export function fromRecord<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <I, A>(
  codomain: Decoder<M, C, I, A>,
  info?: DE.ErrorInfo
) => Decoder<M, C, ReadonlyRecord<string, I>, ReadonlyRecord<string, A>> {
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
  info?: DE.ErrorInfo
) => Decoder<M, C, unknown, ReadonlyRecord<string, A>> {
  return (codomain, info) => compose_(M)(UnknownRecord(M)(info), fromRecord(M)(codomain, info));
}

export function fromTuple<M extends HKT.URIS, C>(
  M: P.Applicative<M, V<C>> & P.Bifunctor<M, C>
): <A extends ReadonlyArray<Decoder<M, C, any, any>>>(
  ...components: A
) => (
  info?: DE.ErrorInfo
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
) => (info?: DE.ErrorInfo) => Decoder<M, C, unknown, [...{ [K in keyof A]: TypeOf<M, A[K]> }]> {
  return (...components) => (info) =>
    compose_(M)(UnknownArray(M)(info) as any, fromTuple(M)(...components)(info));
}

export function union<M extends HKT.URIS, C>(
  M: P.Alt<M, V<C>> & P.Bifunctor<M, C>
): (
  info?: DE.ErrorInfo
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
  info?: DE.ErrorInfo
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
  info?: DE.ErrorInfo
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
  info?: DE.ErrorInfo
) => Decoder<
  M,
  C,
  UnionToIntersection<{ [K in keyof A]: InputOf<M, A[K]> }[keyof A]>,
  UnionToIntersection<{ [K in keyof A]: TypeOf<M, A[K]> }[keyof A]>
> {
  return (decoders, info) => {
    const [left, right, ...rest] = decoders;
    const decoder = A.reduce_(
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
  info?: DE.ErrorInfo
) => Decoder<M, C, InputOf<M, P[keyof P]>, TypeOf<M, P[keyof P]>> {
  return (tag, members, info) => {
    const name: string = pipe(
      members,
      R.reduce([] as string[], (b, a) => [...b, a._meta.name]),
      (as) => as.join(" | ")
    );

    const decode = K.fromSum_(M as P.MonadFail<M, V<C>>)(tag, members, (tag, value, keys) =>
      FS.element(
        DE.key(
          tag,
          DE.required,
          DE.error(
            value,
            keys.length === 0 ? "never" : keys.map((k) => JSON.stringify(k)).join(" | ")
          )
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
  info?: DE.ErrorInfo
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
  info?: DE.ErrorInfo
) => Decoder<M, C, unknown, TypeOf<M, P[keyof P]>> {
  return (tag, members, info) =>
    compose_(M)(UnknownRecord(M)(info) as any, fromSum_(M)(tag, members, info) as any);
}

export function sum<M extends HKT.URIS, C>(
  M: P.MonadFail<M, V<C>> & P.Bifunctor<M, C>
): <T extends string>(
  tag: T,
  info?: DE.ErrorInfo
) => <P extends Record<string, Decoder<M, C, any, any>>>(
  members: P
) => Decoder<M, C, unknown, TypeOf<M, P[keyof P]>> {
  return (tag, info) => (members) => sum_(M)(tag, members, info);
}

export function lazy<M extends HKT.URIS, C>(
  M: P.Bifunctor<M, C>
): <I, A>(id: string, f: () => Decoder<M, C, I, A>, info?: DE.ErrorInfo) => Decoder<M, C, I, A> {
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
