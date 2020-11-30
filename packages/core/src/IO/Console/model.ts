import type { InspectOptions } from "util";
import { inspect } from "util";

import { tag } from "../../Has";
import * as I from "../index";

export interface Console {
  readonly log: (...data: Array<any>) => I.UIO<void>;
  readonly error: (...data: Array<any>) => I.UIO<void>;
  readonly info: (...data: Array<any>) => I.UIO<void>;
  readonly debug: (...data: Array<any>) => I.UIO<void>;

  readonly time: (label?: string) => I.UIO<void>;
  readonly timeEnd: (label?: string) => I.UIO<void>;
  readonly timeLog: (label?: string) => I.UIO<void>;

  readonly count: (label?: string) => I.UIO<void>;
  readonly countReset: (label?: string) => I.UIO<void>;

  readonly inspect: (object: any, options?: InspectOptions) => I.UIO<void>;
}

export const Console = tag<Console>();

export class NodeConsole implements Console {
  log(...data: any[]) {
    return I.total(() => {
      console.log(...data);
    });
  }
  error(...data: any[]) {
    return I.total(() => {
      console.error(...data);
    });
  }
  info(...data: any[]) {
    return I.total(() => {
      console.info(...data);
    });
  }
  debug(...data: any[]) {
    return I.total(() => {
      console.debug(...data);
    });
  }

  time(label?: string) {
    return I.total(() => {
      console.time(label);
    });
  }
  timeEnd(label?: string) {
    return I.total(() => {
      console.timeEnd(label);
    });
  }
  timeLog(label?: string) {
    return I.total(() => {
      console.timeLog(label);
    });
  }

  count(label?: string) {
    return I.total(() => {
      console.count(label);
    });
  }
  countReset(label?: string) {
    return I.total(() => {
      console.countReset(label);
    });
  }

  inspect(object: any, options?: InspectOptions) {
    return I.total(() => {
      console.log(inspect(object, options ?? {}));
    });
  }
}
