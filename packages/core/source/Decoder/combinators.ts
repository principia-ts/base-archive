import * as A from "../Array";
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

export const compose_: <I, A, B>(from: Decoder<I, A>, to: Decoder<A, B>) => Decoder<I, B> = (from, to) => ({
   decode: K.compose_(M)(from, to).decode,
   _meta: {
      name: `(${from._meta.name} >>> ${to._meta.name})`
   }
});

export const compose = <A, B>(to: Decoder<A, B>) => <I>(from: Decoder<I, A>): Decoder<I, B> => compose_(from, to);

export const mapLeftWithInput = <I>(f: (input: I, e: DecodeError) => DecodeError) => <A>(
   decoder: Decoder<I, A>
): Decoder<I, A> => mapLeftWithInput_(decoder, f);

export const mapLeftWithInput_ = <I, A>(
   decoder: Decoder<I, A>,
   f: (input: I, e: DecodeError) => DecodeError
): Decoder<I, A> => ({
   decode: K.mapLeftWithInput_(M)(decoder, f).decode,
   _meta: {
      name: decoder._meta.name
   }
});

export const wrapInfo = <I>(info?: ErrorInfo) => <A>(decoder: Decoder<I, A>): Decoder<I, A> =>
   info ? mapLeftWithInput_(decoder, (_, e) => FS.element(DE.wrap(info, e))) : decoder;

export const withMessage = <I>(
   message: (input: I, e: DecodeError) => string
): (<A>(decoder: Decoder<I, A>) => Decoder<I, A>) =>
   mapLeftWithInput((input, e) => FS.element(DE.wrap({ message: message(input, e) }, e)));

export const refine = <A, B extends A>(refinement: Refinement<A, B>, name: string, info?: ErrorInfo) => <I>(
   from: Decoder<I, A>
): Decoder<I, B> => ({
   decode: K.refine_(M)(from, refinement, (a) => error(a, name, info)).decode,
   _meta: {
      name: name
   }
});

export const parse_ = <I, A, B>(
   from: Decoder<I, A>,
   parser: (a: A) => Either<DecodeError, B>,
   name?: string
): Decoder<I, B> => ({
   decode: K.parse_(M)(from, parser).decode,
   _meta: {
      name: name ?? from._meta.name
   }
});

export const parse = <A, B>(parser: (a: A) => Either<DecodeError, B>, name?: string) => <I>(
   from: Decoder<I, A>
): Decoder<I, B> => parse_(from, parser, name);

export const nullable: (info?: ErrorInfo) => <I, A>(or: Decoder<I, A>) => Decoder<undefined | null | I, null | A> = (
   info
) => (or) => ({
   decode: K.nullable_(M)(or, (u, e) =>
      FS.combine(FS.element(DE.member(0, error(u, "null | undefined", info))), FS.element(DE.member(1, e)))
   ).decode,
   _meta: {
      name: `${or._meta.name} | null | undefined`
   }
});

export const optional = (info?: ErrorInfo) => <I, A>(or: Decoder<I, A>): Decoder<I | null | undefined, Option<A>> => ({
   decode: K.optional_(M)(or, (u, e) =>
      FS.combine(FS.element(DE.member(0, error(u, "null | undefined", info))), FS.element(DE.member(1, e)))
   ).decode,
   _meta: {
      name: `${or._meta.name} | null | undefined`
   }
});

export const fromType = <P extends Record<string, Decoder<any, any>>>(
   properties: P,
   info?: ErrorInfo
): Decoder<{ [K in keyof P]: InputOf<P[K]> }, { [K in keyof P]: TypeOf<P[K]> }> => {
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
};

export const type = <P extends Record<string, Decoder<any, any>>>(
   properties: P,
   info?: ErrorInfo
): Decoder<unknown, { [K in keyof P]: TypeOf<P[K]> }> =>
   compose_(UnknownRecord(info) as any, fromType(properties, info));

export const fromPartial = <P extends Record<string, Decoder<any, any>>>(
   properties: P,
   info?: ErrorInfo
): Decoder<Partial<{ [K in keyof P]: InputOf<P[K]> }>, Partial<{ [K in keyof P]: TypeOf<P[K]> }>> => {
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
};

export const partial = <A>(
   properties: { [K in keyof A]: Decoder<unknown, A[K]> },
   info?: ErrorInfo
): Decoder<unknown, Partial<{ [K in keyof A]: A[K] }>> =>
   compose_(UnknownRecord(info) as any, fromPartial(properties, info));

export const fromArray = <I, A>(item: Decoder<I, A>, info?: ErrorInfo): Decoder<ReadonlyArray<I>, ReadonlyArray<A>> => {
   const name = `Array<${item._meta.name}>`;
   return pipe(
      {
         decode: K.fromArray_(M)(item, (i, e) => FS.element(DE.index(i, DE.optional, e))).decode,
         _meta: { name }
      },
      wrapInfo({ name, ...info })
   );
};

export const array = <A>(item: Decoder<unknown, A>, info?: ErrorInfo): Decoder<unknown, ReadonlyArray<A>> =>
   compose_(UnknownArray(info), fromArray(item, info));

export const fromRecord = <I, A>(
   codomain: Decoder<I, A>,
   info?: ErrorInfo
): Decoder<ReadonlyRecord<string, I>, ReadonlyRecord<string, A>> => {
   const name = `Record<string, ${codomain._meta.name}>`;
   return pipe(
      {
         decode: K.fromRecord_(M)(codomain, (k, e) => FS.element(DE.key(k, DE.optional, e))).decode,
         _meta: { name }
      },
      wrapInfo({ name, ...info })
   );
};

export const record = <A>(codomain: Decoder<unknown, A>, info?: ErrorInfo): Decoder<unknown, Record<string, A>> =>
   compose_(UnknownRecord(info), fromRecord(codomain, info));

export const fromTuple = <C extends ReadonlyArray<Decoder<any, any>>>(
   ...components: C
): ((info?: ErrorInfo) => Decoder<[...{ [K in keyof C]: InputOf<C[K]> }], [...{ [K in keyof C]: TypeOf<C[K]> }]>) => (
   info
) => {
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

export const tuple = <A extends ReadonlyArray<unknown>>(...components: { [K in keyof A]: Decoder<unknown, A[K]> }) => (
   info?: ErrorInfo
): Decoder<unknown, A> => compose_(UnknownArray(info) as any, fromTuple(...components)(info));

export const union = (info?: ErrorInfo) => <MS extends readonly [Decoder<any, any>, ...Array<Decoder<any, any>>]>(
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

export const intersect_ = <IA, A, IB, B>(
   left: Decoder<IA, A>,
   right: Decoder<IB, B>,
   name?: string
): Decoder<IA & IB, A & B> =>
   pipe(
      {
         decode: K.intersect_(M)(left, right).decode,
         _meta: {
            name: name ?? `${left._meta.name} & ${right._meta.name}`
         }
      },
      wrapInfo({ name: name ?? `${left._meta.name} & ${right._meta.name}` })
   );

export const intersect = <IB, B>(right: Decoder<IB, B>, name?: string) => <IA, A>(
   left: Decoder<IA, A>
): Decoder<IA & IB, A & B> => intersect_(left, right, name);

export const fromSum_ = <T extends string, MS extends Record<string, Decoder<any, any>>>(
   tag: T,
   members: MS
): Decoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => {
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
};

export const fromSum = <T extends string>(tag: T) => <MS extends Record<string, Decoder<any, any>>>(
   members: MS
): Decoder<InputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => fromSum_(tag, members);

export const sum_ = <T extends string, A>(
   tag: T,
   members: { [K in keyof A]: Decoder<unknown, A[K]> },
   info?: ErrorInfo
): Decoder<unknown, A[keyof A]> => compose_(UnknownRecord(info), fromSum(tag)(members));

export const sum = <T extends string>(tag: T, info?: ErrorInfo) => <A>(
   members: { [K in keyof A]: Decoder<unknown, A[K]> }
): Decoder<unknown, A[keyof A]> => sum_(tag, members, info);

export const lazy = <I, A>(id: string, f: () => Decoder<I, A>, info?: ErrorInfo): Decoder<I, A> =>
   pipe(
      {
         decode: K.lazy_(M)(id, f, (id, e) => FS.element(DE.lazy(id, e))).decode,
         _meta: {
            name: info?.name ?? id
         }
      },
      wrapInfo({ name: id, ...info })
   );

export const map_ = <I, A, B>(fa: Decoder<I, A>, f: (a: A) => B): Decoder<I, B> => ({
   decode: K.map_(M)(fa, f).decode,
   _meta: {
      name: fa._meta.name
   }
});

export const map = <A, B>(f: (a: A) => B) => <I>(fa: Decoder<I, A>): Decoder<I, B> => map_(fa, f);

export const alt_ = <I, A>(me: Decoder<I, A>, that: () => Decoder<I, A>): Decoder<I, A> => ({
   decode: K.alt_(M)(me, that).decode,
   _meta: {
      name: `${me._meta.name} <!> ${that()._meta.name}`
   }
});

export const alt = <I, A>(that: () => Decoder<I, A>) => (me: Decoder<I, A>): Decoder<I, A> => alt_(me, that);

export const id = <A>(): Decoder<A, A> => ({
   decode: K.id(M)<A>().decode,
   _meta: {
      name: ""
   }
});
