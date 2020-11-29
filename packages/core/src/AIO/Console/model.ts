import type { InspectOptions } from "util";
import { inspect } from "util";

import { tag } from "../../Has";
import * as T from "../AIO";

export interface Console {
  readonly log: (...data: Array<any>) => T.IO<void>;
  readonly error: (...data: Array<any>) => T.IO<void>;
  readonly info: (...data: Array<any>) => T.IO<void>;
  readonly debug: (...data: Array<any>) => T.IO<void>;

  readonly time: (label?: string) => T.IO<void>;
  readonly timeEnd: (label?: string) => T.IO<void>;
  readonly timeLog: (label?: string) => T.IO<void>;

  readonly count: (label?: string) => T.IO<void>;
  readonly countReset: (label?: string) => T.IO<void>;

  readonly inspect: (object: any, options?: InspectOptions) => T.IO<void>;
}

export const Console = tag<Console>();

export class NodeConsole implements Console {
  log(...data: any[]) {
    return T.total(() => {
      console.log(...data);
    });
  }
  error(...data: any[]) {
    return T.total(() => {
      console.error(...data);
    });
  }
  info(...data: any[]) {
    return T.total(() => {
      console.info(...data);
    });
  }
  debug(...data: any[]) {
    return T.total(() => {
      console.debug(...data);
    });
  }

  time(label?: string) {
    return T.total(() => {
      console.time(label);
    });
  }
  timeEnd(label?: string) {
    return T.total(() => {
      console.timeEnd(label);
    });
  }
  timeLog(label?: string) {
    return T.total(() => {
      console.timeLog(label);
    });
  }

  count(label?: string) {
    return T.total(() => {
      console.count(label);
    });
  }
  countReset(label?: string) {
    return T.total(() => {
      console.countReset(label);
    });
  }

  inspect(object: any, options?: InspectOptions) {
    return T.total(() => {
      console.log(inspect(object, options ?? {}));
    });
  }
}
