export type WidenLiteral<A> = A extends string
  ? string
  : A extends number
  ? number
  : A extends boolean
  ? boolean
  : A;
