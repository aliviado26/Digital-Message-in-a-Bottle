import { describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("logs structured JSON with the given level, message, and context", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("hello", { userId: "123" });

    expect(spy).toHaveBeenCalledTimes(1);
    const [payload] = spy.mock.calls[0];
    const parsed = JSON.parse(payload as string);
    expect(parsed).toMatchObject({ level: "info", message: "hello", userId: "123" });

    spy.mockRestore();
  });
});
