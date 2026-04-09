import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const TEST_ROOT = path.join(os.tmpdir(), "ar-cli-test-" + Date.now());
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "..", "dist", "index.js");

async function runCli(...args) {
  const { stdout, stderr } = await execFileAsync(
    "node",
    [CLI, "--root", TEST_ROOT, "--project", "cli-test", ...args],
    { timeout: 10000 }
  );
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

describe("AgentRecall CLI", () => {
  after(() => {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it("--version prints version", async () => {
    const { stdout } = await execFileAsync("node", [CLI, "--version"]);
    assert.ok(stdout.trim().match(/^\d+\.\d+\.\d+$/));
  });

  it("--help prints usage", async () => {
    const { stdout } = await execFileAsync("node", [CLI, "--help"]);
    assert.ok(stdout.includes("ar v"));
    assert.ok(stdout.includes("JOURNAL"));
    assert.ok(stdout.includes("PALACE"));
  });

  it("write + read roundtrip", async () => {
    const writeResult = await runCli("write", "## Brief", "CLI test entry");
    const parsed = JSON.parse(writeResult.stdout);
    assert.equal(parsed.success, true);

    const readResult = await runCli("read");
    const readParsed = JSON.parse(readResult.stdout);
    assert.ok(readParsed.content.includes("CLI test"));
  });

  it("capture creates log entry", async () => {
    const result = await runCli(
      "capture",
      "What is CLI?",
      "A command-line interface"
    );
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.success, true);
    assert.equal(parsed.entry_number, 1);
  });

  it("list shows entries", async () => {
    const result = await runCli("list");
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.entries.length >= 1);
  });

  it("projects lists tracked projects", async () => {
    const result = await runCli("projects");
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.projects.some((p) => p.slug === "cli-test"));
  });

  it("palace write + read", async () => {
    const writeResult = await runCli(
      "palace",
      "write",
      "test-room",
      "CLI palace memory"
    );
    const writeParsed = JSON.parse(writeResult.stdout);
    assert.equal(writeParsed.success, true);

    const readResult = await runCli("palace", "read", "test-room");
    const readParsed = JSON.parse(readResult.stdout);
    assert.ok(readParsed.content.includes("CLI palace"));
  });

  it("palace walk returns context", async () => {
    const result = await runCli("palace", "walk", "--depth", "identity");
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.depth, "identity");
  });

  it("palace lint runs health check", async () => {
    const result = await runCli("palace", "lint");
    const parsed = JSON.parse(result.stdout);
    assert.ok(typeof parsed.total_issues === "number");
  });

  it("search finds content", async () => {
    const result = await runCli("search", "CLI test");
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.results.length > 0);
  });

  it("unknown command exits with error", async () => {
    try {
      await runCli("nonexistent-command");
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err.stderr.includes("Unknown command"));
    }
  });
});
