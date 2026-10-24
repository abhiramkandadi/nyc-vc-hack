/**
 * Run: npx tsx scripts/seedAktaData.ts
 * Or hydrate a captured, normalized MCP response:
 * npx tsx scripts/seedAktaData.ts --mcp-snapshot /path/to/captured-records.json
 */
import { loadEnvConfig } from "@next/env";
import { spawnSync, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { open, readFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { AktaSeedDocument, HydrationResult } from "../lib/akta";

const root = process.cwd();
const target = join(root, "lib", "seededAktaData.json");

function inspectGit(): void {
  const status = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  if (status.trim()) console.log("[seed] Working directory status:\n" + status.trim());
}
async function existingSeed(): Promise<string | null> {
  try { return await readFile(target, "utf8"); }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
async function seed(): Promise<void> {
  inspectGit();
  // .env.local is loaded server-side; neither credentials nor raw errors are printed.
  loadEnvConfig(root);
  const akta = await import("../lib/akta");
  const original = await existingSeed();
  const lockPath = join(root, "lib", ".seedAktaData.lock");
  const lock = await open(lockPath, "wx", 0o600);
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    console.log("[seed] Fetching real akta.pro data: 15-second request deadlines, at most 3 attempts.");
    akta.reportAktaTelemetry("seed_started", { source: "live" });
    let result: HydrationResult;
    let sourceApiUrl = process.env.AKTA_API_URL || "https://api.akta.pro/api/v1";
    let provenance: AktaSeedDocument["provenance"] = { transport: "rest", newsIds: [], notes: [] };
    const snapshotIndex = process.argv.indexOf("--mcp-snapshot");
    if (snapshotIndex !== -1) {
      const path = process.argv[snapshotIndex + 1];
      if (!path) throw new akta.AktaHydrationError("MCP_SNAPSHOT_PATH_REQUIRED");
      const content = await readFile(path, "utf8");
      if (Buffer.byteLength(content, "utf8") > 2_097_152) throw new akta.AktaHydrationError("MCP_SNAPSHOT_TOO_LARGE");
      const snapshot = JSON.parse(content) as Record<string, unknown>;
      if (!snapshot || snapshot.provider !== "akta.pro" || snapshot.sourceApiUrl !== "https://mcp.akta.pro/mcp" || !Array.isArray(snapshot.records) || typeof snapshot.retrievedAt !== "string" || !Number.isFinite(Date.parse(snapshot.retrievedAt))) throw new akta.AktaHydrationError("INVALID_MCP_SNAPSHOT");
      result = { data: akta.hydrateStartupProfiles(snapshot.records), fetchedAt: new Date(snapshot.retrievedAt).toISOString(), cached: false };
      sourceApiUrl = "https://mcp.akta.pro/mcp";
      provenance = {
        transport: "mcp",
        newsIds: Array.isArray(snapshot.newsIds) ? snapshot.newsIds.filter((id): id is number => typeof id === "number" && Number.isInteger(id)) : [],
        notes: Array.isArray(snapshot.notes) ? snapshot.notes.filter((note): note is string => typeof note === "string") : [],
      };
      console.log("[seed] Hydrated captured akta.pro MCP records with source-linked evidence.");
    } else {
      result = await akta.fetchStartupProfiles({
        timeoutMs: 15_000, attempts: 3, perRequestTimeout: true, bypassCache: true,
        onProgress: (event) => console.log("[seed]", JSON.stringify(event)),
      });
    }
    if (result.data.length < 6) throw new akta.AktaHydrationError("INSUFFICIENT_REAL_PROFILES");
    const document: AktaSeedDocument = {
      schemaVersion: 1, provider: "akta.pro", fetchedAt: result.fetchedAt,
      sourceApiUrl, data: result.data, provenance,
    };
    if (!akta.parseSeededAktaData(document)) throw new akta.AktaHydrationError("INVALID_SEED_OUTPUT");
    inspectGit();
    if (await existingSeed() !== original) throw new akta.AktaHydrationError("SEED_CHANGED_BY_ANOTHER_WORKER");
    // Exclusive temporary creation + same-directory rename preserve a previous good
    // snapshot on HTTP failure, validation failure, or interrupted serialization.
    const file = await open(temporary, "wx", 0o644);
    try {
      await file.writeFile(JSON.stringify(document, null, 2) + "\n", "utf8");
      await file.sync();
    } finally { await file.close(); }
    inspectGit();
    if (await existingSeed() !== original) throw new akta.AktaHydrationError("SEED_CHANGED_BY_ANOTHER_WORKER");
    await rename(temporary, target);
    akta.reportAktaTelemetry("seed_saved", { source: "seed", count: result.data.length });
    console.log(`[seed] Saved ${result.data.length} real provider profiles to lib/seededAktaData.json.`);
    console.log("[seed] Stock portraits, inferred fields, and evidence-coverage scores remain labeled.");
    inspectGit();
  } catch (error: unknown) {
    const code = error instanceof akta.AktaHydrationError ? error.code : "SEED_FAILED";
    akta.reportAktaTelemetry("seed_failed", { source: "live", code });
    throw error;
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    await lock.close();
    await unlink(lockPath);
    await akta.flushAktaTelemetry();
  }
}

// server-only intentionally rejects ordinary Node imports. Re-execute this CLI
// with Next's react-server export condition, preserving tsx's existing loader.
// No runtime stubs, package.json changes, or dependency installation are needed.
if (!process.execArgv.some((argument) => argument === "--conditions=react-server")) {
  const child = spawnSync(process.execPath, [...process.execArgv, "--conditions=react-server", ...process.argv.slice(1)], { cwd: root, env: process.env, stdio: "inherit" });
  process.exitCode = child.status ?? 1;
} else {
  seed().catch((error: unknown) => {
    const candidate = error as { code?: unknown; status?: unknown };
    console.error("[seed] No replacement seed was written.", {
      code: typeof candidate?.code === "string" ? candidate.code : "SEED_FAILED",
      status: typeof candidate?.status === "number" ? candidate.status : undefined,
    });
    process.exitCode = 1;
  });
}
