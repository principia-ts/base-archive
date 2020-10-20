import type { Fail, Fail1, Fail2, Fail3, Fail4, FailHKT } from "../Fail";
import type * as HKT from "../HKT";
import type { Monad } from "../Monad";
import type { Monad1, Monad2, Monad3, Monad4, MonadHKT } from "../Monad/Monad";

export interface MonadFailHKT<F, TC = HKT.Auto> extends MonadHKT<F, TC>, FailHKT<F, TC> {}

export interface MonadFail<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C>, Fail<F, C> {}

export interface MonadFail1<F extends HKT.URIS1, TC = HKT.Auto> extends Monad1<F, TC>, Fail1<F, TC> {}

export interface MonadFail2<F extends HKT.URIS2, TC = HKT.Auto> extends Monad2<F, TC>, Fail2<F, TC> {}

export interface MonadFail3<F extends HKT.URIS3, TC = HKT.Auto> extends Monad3<F, TC>, Fail3<F, TC> {}

export interface MonadFail4<F extends HKT.URIS4, TC = HKT.Auto> extends Monad4<F, TC>, Fail4<F, TC> {}
