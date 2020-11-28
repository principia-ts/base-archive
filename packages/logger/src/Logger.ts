import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import * as T from "@principia/core/Task";
import type { Clock } from "@principia/core/Task/Clock";
import { HasClock } from "@principia/core/Task/Clock";
import * as C from "@principia/core/Task/Console";
import * as L from "@principia/core/Task/Layer";
import * as fs from "@principia/node/fs";
import { pipe } from "@principia/prelude";
import type ChalkType from "chalk";
import { formatISO9075, getMilliseconds } from "date-fns";
import stripAnsi from "strip-ansi";

import type { ChalkFn } from "./utils";

export type LogFn = (m: ChalkFn) => T.RIO<Has<Clock>, void>;

export type ColorMap = Record<LogLevel, ChalkType.Chalk>;

export interface Logger {
  readonly debug: LogFn;
  readonly error: LogFn;
  readonly info: LogFn;
  readonly warning: LogFn;
}
export const Logger = tag<Logger>();

export interface Chalk {
  chalk: typeof ChalkType;
}
export const Chalk = tag<Chalk>();

export type LogLevel = keyof Logger;

const severity: Record<LogLevel, number> = {
  debug: 3,
  info: 2,
  warning: 1,
  error: 0
};

export interface LoggerOptions {
  path: string;
  level?: LogLevel;
  theme?: T.RIO<Has<Chalk>, ColorMap>;
}

export type LoggerConfig = {
  [K in keyof LoggerOptions]-?: NonNullable<LoggerOptions[K]>;
};
export const LoggerConfig = tag<LoggerConfig>();

export function loggerConfig(config: LoggerOptions) {
  return L.create(LoggerConfig).pure({
    path: config.path,
    level: config.level ?? "error",
    theme:
      config.theme ??
      T.asksService(Chalk)(({ chalk }) => ({
        debug: chalk.gray,
        info: chalk.blue,
        warning: chalk.yellow,
        error: chalk.red
      }))
  });
}

export interface LogEntry {
  level: LogLevel;
  message: string;
}
const LogEntry = tag<LogEntry>();

const timestamp = T.map_(
  T.asksServiceM(HasClock)((clock) => clock.currentTime),
  (ms) => `${formatISO9075(ms)}.${getMilliseconds(ms).toString().padStart(3, "0")}`
);

const showConsoleLogEntry = T.gen(function* (_) {
  const config = yield* _(LoggerConfig);
  const { chalk } = yield* _(Chalk);
  const time = yield* _(timestamp);
  const entry = yield* _(LogEntry);
  const theme = yield* _(config.theme);
  return `[${theme[entry.level](
    entry.level.toUpperCase()
  )}] ${entry.message} ${chalk.gray.dim(time)}`;
});

const showFileLogEntry = T.gen(function* (_) {
  const time = yield* _(timestamp);
  const entry = yield* _(LogEntry);
  return `${time} [${entry.level.toUpperCase()}] ${stripAnsi(entry.message)}\n`;
});

const logToConsole = T.gen(function* (_) {
  const console = yield* _(C.Console);
  const entry = yield* _(showConsoleLogEntry);
  return yield* _(console.log(entry));
});

const logToFile = T.gen(function* (_) {
  const show = yield* _(showFileLogEntry);
  const config = yield* _(LoggerConfig);
  return yield* _(fs.appendFile(config.path, show));
});

function _log(message: ChalkFn, level: LogLevel) {
  return T.gen(function* (_) {
    const { level: configLevel, path } = yield* _(LoggerConfig);
    const { chalk } = yield* _(Chalk);
    const console = yield* _(C.Console);
    const entry: LogEntry = {
      message: message(chalk),
      level
    };

    yield* _(
      pipe(
        logToConsole,
        T.andThen(logToFile),
        T.catchAll((error) => console.log(`Error when writing to path ${path}\n${error}`)),
        T.when(() => severity[configLevel] >= severity[level]),
        T.giveService(LogEntry)(entry)
      )
    );
  });
}

export const LiveLogger = L.create(Logger).fromTask(
  T.asksServices({ config: LoggerConfig, console: C.Console, chalk: Chalk })(
    ({ config, console, chalk }): Logger => ({
      debug: (m) =>
        pipe(
          _log(m, "debug"),
          T.giveService(C.Console)(console),
          T.giveService(LoggerConfig)(config),
          T.giveService(Chalk)(chalk)
        ),
      info: (m) =>
        pipe(
          _log(m, "info"),
          T.giveService(C.Console)(console),
          T.giveService(LoggerConfig)(config),
          T.giveService(Chalk)(chalk)
        ),
      warning: (m) =>
        pipe(
          _log(m, "warning"),
          T.giveService(C.Console)(console),
          T.giveService(LoggerConfig)(config),
          T.giveService(Chalk)(chalk)
        ),
      error: (m) =>
        pipe(
          _log(m, "error"),
          T.giveService(C.Console)(console),
          T.giveService(LoggerConfig)(config),
          T.giveService(Chalk)(chalk)
        )
    })
  )
);

export const { debug, info, warning, error } = T.deriveLifted(Logger)(
  ["debug", "info", "warning", "error"],
  [],
  []
);
