import { expect, test } from "vitest";
import { WflowError } from "./wflowError.js";
import { readRunId } from "./runMetadata.js";
import { createInMemoryFilesystemGateway } from "./testFixtures/inMemoryFilesystemGateway.js";

test("readRunId returns the run.id from a valid run.json", async () => {
  const fs = createInMemoryFilesystemGateway({
    "/ws/stages/run.json": JSON.stringify({ run: { id: "run-1", name: "Run one", description: "first run" } }),
  });

  await expect(readRunId("/ws/stages/run.json", fs)).resolves.toBe("run-1");
});

test("readRunId throws when run.json is missing", async () => {
  const fs = createInMemoryFilesystemGateway();

  await expect(readRunId("/ws/stages/run.json", fs)).rejects.toThrow(WflowError);
});

test("readRunId throws when run.json is not valid JSON", async () => {
  const fs = createInMemoryFilesystemGateway({ "/ws/stages/run.json": "not json" });

  await expect(readRunId("/ws/stages/run.json", fs)).rejects.toThrow(WflowError);
});

test("readRunId throws when run.id is missing", async () => {
  const fs = createInMemoryFilesystemGateway({
    "/ws/stages/run.json": JSON.stringify({ run: { name: "Run one", description: "first run" } }),
  });

  await expect(readRunId("/ws/stages/run.json", fs)).rejects.toThrow(WflowError);
});
