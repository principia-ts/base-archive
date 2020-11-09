export type _A<T> = [T] extends [{ ["_A"]: () => infer A }] ? A : never;

export type _R<T> = [T] extends [{ ["_R"]: (_: infer R) => void }] ? R : never;

export type _E<T> = [T] extends [{ ["_E"]: () => infer E }] ? E : never;
