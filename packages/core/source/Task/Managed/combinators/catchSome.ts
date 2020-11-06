import * as O from "../../../Option";
import type { Cause } from "../../Exit/Cause";
import { fail, halt } from "../constructors";
import type { Managed } from "../model";
import { catchAll_, catchAllCause_ } from "./catchAll";

export const catchSome_ = <R, E, A, R1, E1, B>(
   ma: Managed<R, E, A>,
   pf: (e: E) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> => catchAll_(ma, (e) => O.getOrElse_(pf(e), () => fail<E | E1>(e)));

export const catchSome = <E, R1, E1, B>(pf: (e: E) => O.Option<Managed<R1, E1, B>>) => <R, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E | E1, A | B> => catchSome_(ma, pf);

export const catchSomeCause_ = <R, E, A, R1, E1, B>(
   ma: Managed<R, E, A>,
   pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> => catchAllCause_(ma, (e) => O.getOrElse_(pf(e), () => halt<E | E1>(e)));

export const catchSomeCause = <E, R1, E1, B>(pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>) => <R, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E | E1, A | B> => catchSomeCause_(ma, pf);
