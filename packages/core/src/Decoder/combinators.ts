import type { UnionToIntersection } from "@principia/prelude/Utils";

import * as A from "../Array/_core";
import type { Either } from "../Either";
import * as FS from "../FreeSemigroup";
import type { Refinement } from "../Function";
import { pipe } from "../Function";
import * as K from "../KleisliDecoder";
import type { Option } from "../Option";
import type { ReadonlyRecord } from "../Record";
import * as R from "../Record";
import type { DecodeError, ErrorInfo } from "./decode-error";
import { error } from "./decode-error";
import * as DE from "./DecodeError";
import type { Decoder, InputOf, TypeOf } from "./model";
import { M } from "./monad";
import { UnknownArray, UnknownRecord } from "./primitives";

export function compose_<I, A, B>(from: Decoder<I, A>, to: Decoder<A, B>): Decoder<I, B> {
   return {
      decode: K.compose_(M)(from, to).decode,
      _meta: {
         name: `(${from._meta.name} >>> ${to._meta.name})`
      }
   };
}

export function compose<A, B>(to: Decoder<A, B>): <I>(from: Decoder<I, A>) => Decoder<I, B> {
   return (from) => compose_(from, to);
}

export function mapLeftWithInput<I>(
   f: (input: I, e: DecodeError) => DecodeError
): <A>(decoder: Decoder<I, A>) => Decoder<I, A> {
   return (decoder) => mapLeftWithInput_(decoder, f);
}

export function mapLeftWithInput_<I, A>(
   decoder: Decoder<I, A>,
   f: (input: I, e: DecodeError) => DecodeError
): Decoder<I, A> {
   return {
      decode: K.mapLeftWithInput_(M)(decoder, f).decode,
      _meta: {
         name: decoder._meta.name
      }
   };
}

export function wrapInfo<I>(info?: ErrorInfo): <A>(decoder: Decoder<I, A>) => Decoder<I, A> {
   return (decoder) => (info ? mapLeftWithInput_(decoder, (_, e) => FS.element(DE.wrap(info, e))) : decoder);
}

export function withMessage<I>(
   message: (input: I, e: DecodeError) => string
): <A>(decoder: Decoder<I, A>) => Decoder<I, A> {
   return mapLeftWithInput((input, e) => FS.element(DE.wrap({ message: message(input, e) }, e)));
}

export function refine<A, B extends A>(
   refinement: Refinement<A, B>,
   name: string,
   info?: ErrorInfo
): <I>(from: Decoder<I, A>) => Decoder<I, B> {
   return (from) => ({
      decode: K.refine_(M)(from, refinement, (a) => error(a, name, info)).decode,
      _meta: {
         name: name
      }
   });
}

export function parse_<I, A, B>(
   from: Decoder<I, A>,
   parser: (a: A) => Either<DecodeError, B>,
   name?: string
): Decoder<I, B> {
   return {
      decode: K.parse_(M)(from, parser).decode,
      _meta: {
         name: name ?? from._meta.name
      }
   };
}

export function parse<A, B>(
   parser: (a: A) => Either<DecodeError, B>,
   name?: string
): <I>(from: Decoder<I, A>) => Decoder<I, B> {
   return (from) => parse_(from, parser, name);
}

export function nullable(info?: ErrorInfo): <I, A>(or: Decoder<I, A>) => Decoder<I | null | undefined, A | null> {
   return (or) => ({
      decode: K.nullable_(M)(or, (u, e) =>
         FS.combine(FS.element(DE.member(0, error(u, "null | undefined", info))), FS.element(DE.member(1, e)))
      ).decode,
      _meta: {
         name: `${or._meta.name} | null | undefined`
      }
   });
}

export function optional(info?: ErrorInfo): <I, A>(or: Decoder<I, A>) => Decoder<I | null | undefined, Option<A>> {
   return (or) => ({
      decode: K.optional_(M)(or, (u, e) =>
         FS.combine(FS.element(DE.member(0, error(u, "null | undefined", info))), FS.element(DE.member(1, e)))
      ).decode,
      _meta: {
         name: `${or._meta.name} | null | undefined`
      }
   });
}

export function fromType<P extends Record<string, Decoder<any, any>>>(
   properties: P,
   info?: ErrorInfo
): Decoder<
   {
      [K in keyof P]: InputOf<P[K]>;
   },
   {
      [K in keyof P]: TypeOf<P[K]>;
   }
> {
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
      wrapInfo({ name, ...info })
   );
}

export function type<P extends Record<string, Decoder<any, any>>>(
   properties: P,
   info?: ErrorInfo
): Decoder<
   unknown,
   {
      [K in keyof P]: TypeOf<P[K]>;
   }
> {
   return compose_(UnknownRecord(info) as any, fromType(properties, info));
}

export function fromPartial<P extends Record<string, Decoder<any, any>>>(
   properties: P,
   info?: ErrorInfo
): Decoder<
   Partial<
      {
         [K in keyof P]: InputOf<P[K]>;
      }
   >,
   Partial<
      {
         [K in keyof P]: TypeOf<P[K]>;
      }
   >
> {
   const name: string = pipe(
      properties,
      R.reduceWithIndex([] as string[], (k, b, a) => [...b, `${k}?: ${a._meta.name}`]),
      (as) => `{ ${as.join(", ")} }`
   );
   return pipe(
      {
         decode: K.fromPartial_(M)(properties, (k, e) => FS.element(DE.key(k, DE.optional, e))).decode,
         _meta: {
            name
         }
      },
      wrapInfo({ name, ...info })
   );
}

export function partial<A>(
   properties: {
      [K in keyof A]: Decoder<unknown, A[K]>;
   },
   info?: ErrorInfo
): Decoder<
   unknown,
   Partial<
      {
         [K in keyof A]: A[K];
      }
   >
> {
   return compose_(UnknownRecord(info) as any, fromPartial(properties, info));
}

export function fromArray<I, A>(item: Decoder<I, A>, info?: ErrorInfo): Decoder<ReadonlyArray<I>, ReadonlyArray<A>> {
   const name = `Array<${item._meta.name}>`;
   return pipe(
      {
         decode: K.fromArray_(M)(item, (i, e) => FS.element(DE.index(i, DE.optional, e))).decode,
         _meta: { name }
      },
      wrapInfo({ name, ...info })
   );
}

export function array<A>(item: Decoder<unknown, A>, info?: ErrorInfo): Decoder<unknown, ReadonlyArray<A>> {
   return compose_(UnknownArray(info), fromArray(item, info));
}

export function fromRecord<I, A>(
   codomain: Decoder<I, A>,
   info?: ErrorInfo
): Decoder<ReadonlyRecord<string, I>, ReadonlyRecord<string, A>> {
   const name = `Record<string, ${codomain._meta.name}>`;
   return pipe(
      {
         decode: K.fromRecord_(M)(codomain, (k, e) => FS.element(DE.key(k, DE.optional, e))).decode,
         _meta: { name }
      },
      wrapInfo({ name, ...info })
   );
}

export function record<A>(codomain: Decoder<unknown, A>, info?: ErrorInfo): Decoder<unknown, Record<string, A>> {
   return compose_(UnknownRecord(info), fromRecord(codomain, info));
}

export function fromTuple<C extends ReadonlyArray<Decoder<any, any>>>(
   ...components: C
): (
   info?: ErrorInfo
) => Decoder<
   [
      ...{
         [K in keyof C]: InputOf<C[K]>;
      }
   ],
   [
      ...{
         [K in keyof C]: TypeOf<C[K]>;
      }
   ]
> {
   return (info) => {
      const name: string = pipe(
         components,
         A.map((d) => d._meta.name),
         (as) => `[${as.join(", ")}]`
      );
      return pipe(
         {
            decode: K.fromTuple(M)((i, e) => FS.element(DE.index(i, DE.required, e)))(...components).decode,
            _meta: { name }
         },
         wrapInfo({ name, ...info })
      );
   };
}

export function tuple<A extends ReadonlyArray<unknown>>(
   ...components: {
      [K in keyof A]: Decoder<unknown, A[K]>;
   }
): (info?: ErrorInfo | undefined) => Decoder<unknown, A> {
   return (info) => compose_(UnknownArray(info) as any, fromTuple(...components)(info));
}

export function union(info?: ErrorInfo) {
   return <MS extends readonly [Decoder<any, any>, ...Array<Decoder<any, any>>]>(
      ...members: MS
   ): Decoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => {
      const name = members.join(" | ");
      return pipe(
         {
            decode: K.union(M)((i, e) => FS.element(DE.member(i, e)))(...members).decode,
            _meta: { name }
         } as Decoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>>,
         wrapInfo({ name, ...info })
      );
   };
}

export function intersect_<IA, A, IB, B>(
   left: Decoder<IA, A>,
   right: Decoder<IB, B>,
   name?: string
): Decoder<IA & IB, A & B> {
   return pipe(
      {
         decode: K.intersect_(M)(left, right).decode,
         _meta: {
            name: name ?? `${left._meta.name} & ${right._meta.name}`
         }
      },
      wrapInfo({ name: name ?? `${left._meta.name} & ${right._meta.name}` })
   );
}

export function intersect<IB, B>(
   right: Decoder<IB, B>,
   name?: string
): <IA, A>(left: Decoder<IA, A>) => Decoder<IA & IB, A & B> {
   return (left) => intersect_(left, right, name);
}

export function intersectAll<
   A extends readonly [Decoder<any, any>, Decoder<any, any>, ...(readonly Decoder<any, any>[])]
>(
   decoders: A,
   name?: string
): Decoder<
   UnionToIntersection<
      {
         [K in keyof A]: InputOf<A[K]>;
      }[keyof A]
   >,
   UnionToIntersection<
      {
         [K in keyof A]: TypeOf<A[K]>;
      }[keyof A]
   >
> {
   const [left, right, ...rest] = decoders;
   const decode = A.reduce_(rest, K.intersect_(M)(left, right), (b, a) => K.intersect_(M)(b, a)).decode;
   const _name = name ?? A.map_(decoders, (d) => d._meta.name).join(" & ");

   return pipe({ decode, _meta: { name: name ?? _name } }, wrapInfo({ name: name ?? _name }));
}

export function fromSum_<T extends string, MS extends Record<string, Decoder<any, any>>>(
   tag: T,
   members: MS
): Decoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> {
   const name: string = pipe(
      members,
      R.reduce([] as string[], (b, a) => [...b, a._meta.name]),
      (as) => as.join(" | ")
   );

   const decode = K.fromSum_(M)(tag, members, (tag, value, keys) =>
      FS.element(
         DE.key(
            tag,
            DE.required,
            error(value, keys.length === 0 ? "never" : keys.map((k) => JSON.stringify(k)).join(" | "))
         )
      )
   ).decode;

   return pipe({ decode, _meta: { name } }, wrapInfo({ name }));
}

export function fromSum<T extends string>(tag: T) {
   return <MS extends Record<string, Decoder<any, any>>>(
      members: MS
   ): Decoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => fromSum_(tag, members);
}

export function sum_<T extends string, A>(
   tag: T,
   members: {
      [K in keyof A]: Decoder<unknown, A[K]>;
   },
   info?: ErrorInfo
): Decoder<unknown, A[keyof A]> {
   return compose_(UnknownRecord(info), fromSum(tag)(members));
}

export function sum<T extends string>(
   tag: T,
   info?: ErrorInfo
): <A>(members: { [K in keyof A]: Decoder<unknown, A[K]> }) => Decoder<unknown, A[keyof A]> {
   return (members) => sum_(tag, members, info);
}

export function lazy<I, A>(id: string, f: () => Decoder<I, A>, info?: ErrorInfo): Decoder<I, A> {
   return pipe(
      {
         decode: K.lazy_(M)(id, f, (id, e) => FS.element(DE.lazy(id, e))).decode,
         _meta: {
            name: info?.name ?? id
         }
      },
      wrapInfo({ name: id, ...info })
   );
}

export function map_<I, A, B>(fa: Decoder<I, A>, f: (a: A) => B): Decoder<I, B> {
   return {
      decode: K.map_(M)(fa, f).decode,
      _meta: {
         name: fa._meta.name
      }
   };
}

export function map<A, B>(f: (a: A) => B): <I>(fa: Decoder<I, A>) => Decoder<I, B> {
   return (fa) => map_(fa, f);
}

export function alt_<I, A>(me: Decoder<I, A>, that: () => Decoder<I, A>): Decoder<I, A> {
   return {
      decode: K.alt_(M)(me, that).decode,
      _meta: {
         name: `${me._meta.name} <!> ${that()._meta.name}`
      }
   };
}

export function alt<I, A>(that: () => Decoder<I, A>): (me: Decoder<I, A>) => Decoder<I, A> {
   return (me) => alt_(me, that);
}

export function id<A>(): Decoder<A, A> {
   return {
      decode: K.id(M)<A>().decode,
      _meta: {
         name: ""
      }
   };
}
