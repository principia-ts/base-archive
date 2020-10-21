import type { IO } from "../Effect/model";

export type State<E, A> = Done<E, A> | Pending<E, A>;

export class Done<E, A> {
   readonly _tag = "Done";
   constructor(readonly value: IO<E, A>) {}
}

export class Pending<E, A> {
   readonly _tag = "Pending";
   constructor(readonly joiners: ReadonlyArray<(_: IO<E, A>) => void>) {}
}
