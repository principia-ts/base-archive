import type { Has } from "@principia/base/data/Has";
import type { Chunk } from "@principia/io/Chunk";
import type { IO } from "@principia/io/IO";

import "@principia/base/unsafe/Operators";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import * as R from "@principia/base/data/Record";
import * as Show from "@principia/base/data/Show";
import { matchTag, matchTag_ } from "@principia/base/util/matchers";
import * as C from "@principia/io/Chunk";
import { Console, NodeConsole } from "@principia/io/Console";
import * as I from "@principia/io/IO";
import { inspect } from "util";

import { CompletedRequestMap } from "../src/CompletedRequestMap";
import * as DS from "../src/DataSource";
import { Request } from "../src/Request";
import * as XQ from "../src/XQuery";

const testData = {
  a: "A",
  b: "B",
  c: "C",
  d: "D"
};

class Get extends Request<string, string> {
  readonly _tag = "Get";
  constructor(readonly id: string) {
    super();
  }
  identifier = `Get(${this.id})`;
}

class GetAll extends Request<string, Record<string, string>> {
  readonly _tag = "GetAll";
  constructor() {
    super();
  }
  identifier = "GetAll";
}

const backendGetAll: I.IO<Has<Console>, never, Record<string, string>> = I.gen(function* (_) {
  const console = yield* _(Console);
  yield* _(console.putStrLn("getAll called"));
  return testData;
});

const backendGetSome = (ids: Chunk<string>): I.IO<Has<Console>, never, Record<string, string>> =>
  I.gen(function* (_) {
    const console = yield* _(Console);
    yield* _(console.putStrLn(`getSome ${A.getShow(Show.string).show(A.from(ids))} called`));
    return C.foldLeft_(ids, {} as Record<string, string>, (r, a) =>
      pipe(
        testData,
        R.lookup(a),
        O.fold(
          () => r,
          (v) => ({ ...r, [a]: v })
        )
      )
    );
  });

type Req = Get | GetAll;

const ds: DS.Batched<Has<Console>, Req> = new (class extends DS.Batched<Has<Console>, Req> {
  identifier = "test";
  run(requests: Chunk<Req>): IO<Has<Console>, never, CompletedRequestMap> {
    const [all, one] = C.partition_(requests, (req) => (req._tag === "GetAll" ? false : true));

    if (C.isNonEmpty(all)) {
      return pipe(
        backendGetAll,
        I.map((allItems) =>
          R.foldLeftWithIndex_(allItems, CompletedRequestMap.empty(), (id, result, value) =>
            result.insert(new Get(id), E.right(value))
          ).insert(new GetAll(), E.right(allItems))
        )
      );
    } else {
      return I.gen(function* (_) {
        const items = yield* _(
          backendGetSome(
            C.flatMap_(
              one,
              matchTag({ Get: ({ id }) => C.single(id), GetAll: () => C.empty<string>() })
            )
          )
        );
        return pipe(
          one,
          C.foldLeft(CompletedRequestMap.empty(), (result, req) =>
            matchTag_(req, {
              GetAll: () => result,
              Get: (req) =>
                pipe(
                  items,
                  R.lookup(req.id),
                  O.fold(
                    () => result.insert(req, E.left("not found")),
                    (value) => result.insert(req, E.right(value))
                  )
                )
            })
          )
        );
      });
    }
  }
})();

const getAll = XQ.fromRequest(new GetAll(), ds);

const get = (id: string) => XQ.fromRequest(new Get(id), ds);

const program = () => {
  const getSome = XQ.foreachPar_(["c", "d"], get);
  const query = getAll.map2(getSome, (_, b) => b);
  return I.gen(function* (_) {
    const console = yield* _(Console);
    const result = yield* _(query.run());
    yield* _(console.putStrLn(inspect(result)));
  });
};

program()["|>"](I.giveLayer(NodeConsole.live))["|>"](I.run);
