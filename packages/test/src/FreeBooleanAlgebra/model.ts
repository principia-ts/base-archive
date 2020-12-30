export class Value<A> {
  readonly _tag = 'Value'
  constructor(readonly value: A) {}
}

export class And<A> {
  readonly _tag = 'And'
  constructor(readonly left: FreeBooleanAlgebra<A>, readonly right: FreeBooleanAlgebra<A>) {}
}

export class Or<A> {
  readonly _tag = 'Or'
  constructor(readonly left: FreeBooleanAlgebra<A>, readonly right: FreeBooleanAlgebra<A>) {}
}

export class Not<A> {
  readonly _tag = 'Not'
  constructor(readonly result: FreeBooleanAlgebra<A>) {}
}

export type FreeBooleanAlgebra<A> = Value<A> | And<A> | Or<A> | Not<A>
