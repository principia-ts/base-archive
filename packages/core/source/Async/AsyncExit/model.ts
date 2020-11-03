export interface Interrupt {
   readonly _tag: "Interrupt";
}

export interface Success<A> {
   readonly _tag: "Success";
   readonly value: A;
}

export interface Failure<E> {
   readonly _tag: "Failure";
   readonly error: E;
}

export type Rejection<E> = Interrupt | Failure<E>;

export type AsyncExit<E, A> = Rejection<E> | Success<A>;
