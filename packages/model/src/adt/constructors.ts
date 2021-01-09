import type { ExtractUnion, KeysDefinition, Remove, Tagged } from './utils'

import * as R from '@principia/base/Record'

export type ConstructorType<C extends Constructors<any, any>> = C extends Constructors<infer A, any> ? A : never

export type Of<A, Tag extends keyof A> = {
  [key in A[Tag] & string]: (a: Remove<ExtractUnion<A, Tag, key>, Tag>) => A
}

export type As<A, Tag extends keyof A> = {
  [key in A[Tag] & string]: (a: Remove<ExtractUnion<A, Tag, key>, Tag>) => ExtractUnion<A, Tag, key>
}

export interface Constructors<A, Tag extends keyof A & string> {
  tag: Tag
  of: Of<A, Tag>
  as: As<A, Tag>
  make: (a: A) => A
}

export const Constructors = <A extends Tagged<Tag>, Tag extends string>(tag: Tag) => (
  keys: KeysDefinition<A, Tag>
): Constructors<A, Tag> => {
  const constructors = R.mapWithIndex((key, _) => (props: object) => ({
    [tag]: key,
    ...props
  }))(keys)
  return {
    of: constructors as Of<A, Tag>,
    as: constructors as As<A, Tag>,
    make: <A>(a: A) => a,
    tag
  }
}
