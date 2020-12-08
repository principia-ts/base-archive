import * as E from "../src/Either";
import { pipe } from "../src/Function";
import * as I from "../src/IO";
import * as Ex from "../src/IO/Exit";

describe("IO", () => {
  it("absolve", async () => {
    const program = I.absolve(I.succeed(E.left("e")));
    expect(await pipe(program, I.result, I.map(Ex.untraced), I.runPromise)).toEqual(Ex.fail("e"));
  });

  it("timeoutFail", async () => {
    const f = jest.fn();
    const res = await pipe(
      I.asyncInterrupt((cb) => {
        const timer = setTimeout(() => {
          cb(I.succeed(1));
        }, 2000);
        return I.total(() => {
          f();
          clearTimeout(timer);
        });
      }),
      I.timeoutFail(100, () => "timeout"),
      I.result,
      I.map(Ex.untraced),
      I.runPromise
    );

    expect(res).toEqual(Ex.fail("timeout"));
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("raceAll - wait", async () => {
    const a = jest.fn();
    const b = jest.fn();
    const c = jest.fn();

    const program = I.raceAll([
      I.asyncInterrupt((cb) => {
        const t = setTimeout(() => {
          cb(I.succeed(1));
        }, 5000);
        return I.total(() => {
          a();
          clearTimeout(t);
        });
      }),
      I.asyncInterrupt((cb) => {
        const t = setTimeout(() => {
          cb(I.succeed(2));
        }, 100);
        return I.total(() => {
          b();
          clearTimeout(t);
        });
      }),
      I.asyncInterrupt((cb) => {
        const t = setTimeout(() => {
          cb(I.succeed(3));
        }, 5000);
        return I.total(() => {
          c();
          clearTimeout(t);
        });
      })
    ], "wait");

    const res = await pipe(program, I.result, I.map(Ex.untraced), I.runPromise);

    expect(res).toEqual(Ex.succeed(2));

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(0);
    expect(c).toHaveBeenCalledTimes(1);
  });
});
