import * as E from "@principia/core/Either";
import { tag } from "@principia/core/Has";
import type { FIO, IO, UIO } from "@principia/core/IO";
import * as T from "@principia/core/IO";
import * as Ex from "@principia/core/IO/Exit";
import * as C from "@principia/core/IO/Cause";
import type { URef } from "@principia/core/IORef";
import * as Ref from "@principia/core/IORef";
import type { URefM } from "@principia/core/IORefM";
import * as RefM from "@principia/core/IORefM";
import * as M from "@principia/core/Managed";
import * as O from "@principia/core/Option";
import * as Q from "@principia/core/Queue";
import type { ReadonlyRecord } from "@principia/core/Record";
import * as S from "@principia/core/Stream";
import { flow } from "@principia/prelude";
import { once } from "events";
import type * as http from "http";
import type { Socket } from "net";
import type { Readable } from "stream";
import type { TLSSocket } from "tls";
import * as Url from "url";

import type { HttpRouteException } from "./exceptions";
import type { Method, Status } from "./utils";

export interface Context {
  req: Request;
  res: Response;
}
export const Context = tag<Context>();

export class Request {
  readonly _req: URef<http.IncomingMessage>;

  private memoizedUrl: URef<E.Either<HttpRouteException, O.Option<Url.Url>>> = Ref.unsafeMake(
    E.right(O.none())
  );

  constructor(req: http.IncomingMessage) {
    this._req = Ref.unsafeMake(req);
  }

  accessReq<R, E, A>(f: (req: http.IncomingMessage) => IO<R, E, A>): IO<R, E, A> {
    return T.chain_(this._req.get, f);
  }

  on(event: "close", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: "data", listener: (chunk: any) => UIO<void>): UIO<UIO<void>>;
  on(event: "end", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: "error", listener: (err: Error) => UIO<void>): UIO<UIO<void>>;
  on(event: "pause", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: "readable", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: "resume", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: string | symbol, listener: (...args: any[]) => UIO<void>): UIO<UIO<void>> {
    return T.chain_(this._req.get, (req) =>
      T.total(() => {
        const _l = (...args: any[]) => {
          if (args) {
            T.run(listener(...args));
          } else {
            T.run(listener());
          }
        };
        req.on(event, _l);
        return T.total(() => {
          req.removeListener(event, _l);
        });
      })
    );
  }

  get headers(): UIO<http.IncomingHttpHeaders> {
    return T.map_(this._req.get, (req) => req.headers);
  }

  get method(): UIO<Method> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this._req.get, (req) => req.method!.toUpperCase() as any);
  }

  get urlString(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this._req.get, (req) => req.url!);
  }

  get url(): FIO<HttpRouteException, Url.Url> {
    return T.chain_(
      this.memoizedUrl.get,
      E.fold(
        T.fail,
        O.fold(
          () =>
            T.chain_(this._req.get, (req) =>
              T.suspend(() => {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  const parsedUrl = Url.parse(req.url!);
                  return T.andThen_(
                    this.memoizedUrl.set(E.right(O.some(parsedUrl))),
                    T.succeed(parsedUrl)
                  );
                } catch (err) {
                  const exception: HttpRouteException = {
                    _tag: "HttpRouteException",
                    status: 400,
                    message: `Error while parsing URL\n\t${JSON.stringify(err)}`
                  };
                  return T.andThen_(this.memoizedUrl.set(E.left(exception)), T.fail(exception));
                }
              })
            ),
          T.succeed
        )
      )
    );
  }

  header(name: string): UIO<O.Option<string | string[]>> {
    return T.map_(this._req.get, (req) => O.fromNullable(req.headers[name]));
  }

  get socket(): UIO<Socket | TLSSocket> {
    return T.map_(this._req.get, (req) => req.socket);
  }

  get protocol(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const previousThis = this;
    return T.gen(function* ($) {
      const socket = yield* $(previousThis.socket);
      if ((socket as TLSSocket).encrypted) return "https";
      else return "http";
    });
  }

  get secure(): UIO<boolean> {
    return T.map_(this.protocol, (p) => p === "https");
  }

  get ip(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this.socket, (s) => s.remoteAddress!);
  }

  get stream(): S.Stream<unknown, Error, Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const previousThis = this;
    return new S.Stream(
      M.gen(function* ($) {
        const req = yield* $(previousThis._req.get);
        const queue = yield* $(
          M.makeExit_(Q.makeUnbounded<FIO<O.Option<Error>, [Buffer]>>(), (q, _) => q.shutdown)
        );

        function dataListener(chunk: any) {
          return T.run(queue.offer(T.succeed([chunk])));
        }
        function endListener() {
          return T.run(queue.offer(T.fail(O.none())));
        }
        function errorListener(err: Error) {
          return T.run(queue.offer(T.fail(O.some(err))));
        }

        yield* $(
          M.makeExit_(
            T.total(() => {
              req.on("data", dataListener);
              req.on("end", endListener);
              req.on("error", errorListener);
            }),
            () =>
              T.total(() => {
                req.removeListener("data", dataListener);
                req.removeListener("end", endListener);
                req.removeListener("error", errorListener);
              })
          )
        );

        return T.flatten(queue.take);
      })
    );
  }
}

export class Response {
  readonly _res: URefM<http.ServerResponse>;

  constructor(res: http.ServerResponse) {
    this._res = RefM.unsafeMake(res);
  }

  on(event: "close", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: "drain", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: "error", listener: (err: Error) => UIO<void>): UIO<UIO<void>>;
  on(event: "finish", listener: () => UIO<void>): UIO<UIO<void>>;
  on(event: "pipe", listener: (src: Readable) => UIO<void>): UIO<UIO<void>>;
  on(event: "unpipe", listener: (src: Readable) => UIO<void>): UIO<UIO<void>>;
  on(event: string | symbol, listener: (...args: any[]) => UIO<void>): UIO<UIO<void>> {
    return T.chain_(this._res.get, (res) =>
      T.total(() => {
        const _l = (...args: any[]) => {
          if (args) {
            T.run(listener(...args));
          } else {
            T.run(listener());
          }
        };
        res.on(event, _l);
        return T.total(() => {
          res.removeListener(event, _l);
        });
      })
    );
  }

  access<R, E, A>(f: (res: http.ServerResponse) => IO<R, E, A>): IO<R, E, A> {
    return T.chain_(this._res.get, f);
  }

  modify<R, E>(f: (res: http.ServerResponse) => IO<R, E, http.ServerResponse>): IO<R, E, void> {
    return RefM.update_(this._res, f);
  }

  status(s: Status): UIO<void> {
    return RefM.update_(this._res, (res) =>
      T.total(() => {
        res.statusCode = s;
        return res;
      })
    );
  }

  get headers(): UIO<http.OutgoingHttpHeaders> {
    return T.map_(this._res.get, (res) => res.getHeaders());
  }

  get(name: string): UIO<O.Option<http.OutgoingHttpHeader>> {
    return T.map_(this._res.get, (res) => O.fromNullable(res.getHeaders()[name]));
  }

  set(headers: ReadonlyRecord<string, http.OutgoingHttpHeader>): FIO<HttpRouteException, void> {
    return RefM.update_(this._res, (res) =>
      T.suspend(() => {
        const hs = Object.entries(headers);
        try {
          for (let i = 0; i < hs.length; i++) {
            res.setHeader(hs[i][0], hs[i][1]);
          }
          return T.succeed(res);
        } catch (err) {
          return T.fail<HttpRouteException>({
            _tag: "HttpRouteException",
            status: 400,
            message: `Failed to set headers\n\t${JSON.stringify(err)}`
          });
        }
      })
    );
  }

  has(name: string): UIO<boolean> {
    return T.map_(this._res.get, (res) => res.hasHeader(name));
  }

  write(chunk: string | Buffer): FIO<HttpRouteException, void> {
    return T.chain_(this._res.get, (res) =>
      T.async<unknown, HttpRouteException, void>((cb) => {
        res.write(chunk, (err) =>
          err
            ? cb(
                T.fail<HttpRouteException>({
                  _tag: "HttpRouteException",
                  status: 400,
                  message: `Failed to write body: ${err.message}`
                })
              )
            : cb(T.unit())
        );
      })
    );
  }

  pipeFrom<R, E>(stream: S.Stream<R, E, string | Buffer>): IO<R, HttpRouteException, void> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    return S.toQueue_(stream)
      ["|>"](
        M.use((q) =>
          T.gen(function* ($) {
            const res = yield* $(_this._res.get);
            const go = () =>
              q.take["|>"](
                T.chain(
                  Ex.foldM(
                    flow(
                      C.sequenceCauseOption,
                      O.fold(() => T.unit(), T.halt)
                    ),
                    (chunks) =>
                      T.async<unknown, Error | E, void>(async (cb) => {
                        for (let i = 0; i < chunks.length; i++) {
                          const needsDrain = res.write(chunks[i], (err) =>
                            err ? cb(T.fail(err)) : undefined
                          );
                          if (needsDrain) {
                            await once(res, "drain");
                          }
                        }
                        cb(go());
                      })
                  )
                )
              );
            yield* $(go());
          })
        )
      )
      ["|>"](
        T.catchAll((e) =>
          T.fail<HttpRouteException>({
            _tag: "HttpRouteException",
            status: 500,
            message: `Failed to write response body: ${e}`
          })
        )
      );
  }

  end(): UIO<void> {
    return T.chain_(this._res.get, (res) =>
      T.total(() => {
        res.end();
      })
    );
  }
}
