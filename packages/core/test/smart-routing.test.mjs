import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const TEST_ROOT_REMEMBER = path.join(os.tmpdir(), "ar-smart-remember-test-" + Date.now());
const TEST_ROOT_RECALL = path.join(os.tmpdir(), "ar-smart-recall-test-" + Date.now());

describe("Smart routing — smartRemember", () => {
  let core;

  before(async () => {
    process.env.AGENT_RECALL_ROOT = TEST_ROOT_REMEMBER;
    core = await import("../dist/index.js");
  });

  after(() => {
    delete process.env.AGENT_RECALL_ROOT;
    fs.rmSync(TEST_ROOT_REMEMBER, { recursive: true, force: true });
  });

  it("routes bug-fix content to knowledge_write", async () => {
    const result = await core.smartRemember({
      content: "Fixed a bug where the login form crashed on submit due to null pointer in auth module",
      project: "test-routing",
    });
    assert.equal(result.success, true);
    assert.equal(result.routed_to, "knowledge_write");
    assert.ok(result.auto_name.length > 0);
  });

  it("routes architecture content to palace_write", async () => {
    const result = await core.smartRemember({
      content: "The system architecture uses a microservices design with REST API schema validation at each boundary",
      project: "test-routing",
    });
    assert.equal(result.success, true);
    assert.equal(result.routed_to, "palace_write");
  });

  it("routes session content to journal_capture", async () => {
    const result = await core.smartRemember({
      content: "Today I worked on the dashboard. Completed the sidebar and made progress on the charts.",
      project: "test-routing",
    });
    assert.equal(result.success, true);
    assert.equal(result.routed_to, "journal_capture");
  });

  it("routes cross-project insights to awareness_update", async () => {
    const result = await core.smartRemember({
      content: "Across projects I've noticed a pattern: never deploy without running the full test suite. This applies when shipping any production release.",
      project: "test-routing",
    });
    assert.equal(result.success, true);
    assert.equal(result.routed_to, "awareness_update");
  });

  it("respects context hint override", async () => {
    const result = await core.smartRemember({
      content: "Some generic text about servers and databases",
      context: "bug fix",
      project: "test-routing",
    });
    assert.equal(result.routed_to, "knowledge_write");
  });

  it("includes routed_to and auto_name in result", async () => {
    const result = await core.smartRemember({
      content: "Decided to use PostgreSQL for the primary database",
      project: "test-routing",
    });
    assert.ok("routed_to" in result);
    assert.ok("auto_name" in result);
    assert.ok("classification" in result);
    assert.ok(result.auto_name.length > 0);
  });
});

describe("Smart routing — smartRecall", () => {
  let core;

  before(async () => {
    process.env.AGENT_RECALL_ROOT = TEST_ROOT_RECALL;
    core = await import("../dist/index.js");
    // Module is cached from first suite — force new root via setRoot
    core.setRoot(TEST_ROOT_RECALL);

    // Seed some data for searching
    await core.journalCapture({
      question: "What did we build today?",
      answer: "Built the authentication module with JWT tokens and session management",
      project: "test-recall",
    });

    await core.palaceWrite({
      room: "architecture",
      topic: "auth-design",
      content: "Authentication uses JWT tokens with refresh rotation. Session stored in HttpOnly cookies.",
      project: "test-recall",
    });
  });

  after(() => {
    core.resetRoot();
    delete process.env.AGENT_RECALL_ROOT;
    fs.rmSync(TEST_ROOT_RECALL, { recursive: true, force: true });
  });

  it("returns results from multiple sources", async () => {
    const result = await core.smartRecall({
      query: "authentication",
      project: "test-recall",
    });
    assert.ok(result.sources_queried.length > 0, `No sources queried`);
    assert.ok(
      result.results.length > 0,
      `No results found. Sources: ${JSON.stringify(result.sources_queried)}, total: ${result.total_searched}`
    );
    // Should have results from at least one source
    const sources = new Set(result.results.map((r) => r.source));
    assert.ok(sources.size >= 1, `Expected at least 1 source, got: ${JSON.stringify([...sources])}`);
  });

  it("results are sorted by score descending", async () => {
    const result = await core.smartRecall({
      query: "authentication",
      project: "test-recall",
    });
    for (let i = 1; i < result.results.length; i++) {
      assert.ok(
        result.results[i - 1].score >= result.results[i].score,
        `Results not sorted: ${result.results[i - 1].score} < ${result.results[i].score}`
      );
    }
  });

  it("respects limit parameter", async () => {
    const result = await core.smartRecall({
      query: "authentication",
      project: "test-recall",
      limit: 2,
    });
    assert.ok(result.results.length <= 2);
  });

  it("returns query and sources_queried in result", async () => {
    const result = await core.smartRecall({
      query: "test",
      project: "test-recall",
    });
    assert.equal(result.query, "test");
    assert.ok(Array.isArray(result.sources_queried));
  });
});
