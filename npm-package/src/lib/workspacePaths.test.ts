import { expect, test } from "vitest";
import { discoverOutputUnits } from "./workspacePaths.js";
import { createInMemoryFilesystemGateway } from "./testFixtures/inMemoryFilesystemGateway.js";

test("discoverOutputUnits includes a numbered stage's outputs dir when it has content", async () => {
  const fs = createInMemoryFilesystemGateway({
    "/ws/stages/01-intake/outputs/idea.json": "{}",
  });

  const units = await discoverOutputUnits("/ws", fs);

  expect(units).toContainEqual({ name: "01-intake", sourceDir: "/ws/stages/01-intake/outputs" });
});

test("discoverOutputUnits skips a numbered stage with no outputs dir", async () => {
  const fs = createInMemoryFilesystemGateway({
    "/ws/stages/02-scoping/references/notes.md": "n/a",
  });

  const units = await discoverOutputUnits("/ws", fs);

  expect(units.find((unit) => unit.name === "02-scoping")).toBeUndefined();
});

test("discoverOutputUnits includes the root stages/outputs unit when present", async () => {
  const fs = createInMemoryFilesystemGateway({
    "/ws/stages/outputs/shared.json": "{}",
  });

  const units = await discoverOutputUnits("/ws", fs);

  expect(units).toContainEqual({ name: "outputs", sourceDir: "/ws/stages/outputs" });
});
