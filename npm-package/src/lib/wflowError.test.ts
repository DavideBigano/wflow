import { expect, test } from "vitest";
import { WflowError, describeError } from "./wflowError.js";

test("describeError includes the hint line for a WflowError that has one", () => {
  const rendered = describeError(new WflowError("thing broke", "try this instead"));
  expect(rendered).toBe("error: thing broke\nhint:  try this instead");
});

test("describeError omits the hint line for a WflowError without one", () => {
  const rendered = describeError(new WflowError("thing broke"));
  expect(rendered).toBe("error: thing broke");
});

test("describeError renders a plain Error without a hint line", () => {
  const rendered = describeError(new Error("boom"));
  expect(rendered).toBe("error: boom");
});

test("describeError stringifies a non-Error thrown value", () => {
  const rendered = describeError("just a string");
  expect(rendered).toBe("error: just a string");
});
