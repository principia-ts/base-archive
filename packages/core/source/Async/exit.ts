export interface Done<A> {
   readonly _tag: "Done";
   readonly value: A;
}

export interface Fail<E> {
   readonly _tag: "Fail";
   readonly value: E;
}

export interface Interrupt {
   readonly _tag: "Interrupt";
}

export interface Die {
   readonly _tag: "Die";
   readonly error: unknown;
}

export type Rejection<E> = Fail<E> | Interrupt | Die;

export type Exit<E, A> = Rejection<E> | Done<A>;

export const interrupt = (): Rejection<never> => ({
   _tag: "Interrupt"
});

export const die = (error: unknown): Rejection<never> => ({
   _tag: "Die",
   error
});

export const fail = <E>(e: E): Rejection<E> => ({
   _tag: "Fail",
   value: e
});

export const done = <E = never, A = never>(a: A): Exit<E, A> => ({
   _tag: "Done",
   value: a
});
