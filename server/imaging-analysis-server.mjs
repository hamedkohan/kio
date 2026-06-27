#!/usr/bin/env node
// Reference backend for the imaging-analysis API contract.
//
// Implements the routes the frontend http adapter expects, serving the same
// per-case documents the mock adapter reads. This makes "real API mode" genuinely
// connectable end to end:
//
//   node server/imaging-analysis-server.mjs            # listens on :8787
//   VITE_IMAGING_API_MODE=http VITE_IMAGING_API_BASE=http://localhost:8787 npm run dev
//
// A real deployment swaps this file's data source (DB / pipeline) for the file
// reads below; the contract and routes are unchanged. Note: the GitHub Pages
// demo is a static host and stays in mock mode — this server is for real/local
// deployments.
//
// Routes:
//   GET /health
//   GET /cases                         -> [{ case_id }]
//   GET /cases/:id/imaging-analysis    -> ImagingAnalysisResponse
//   GET /mesh/region_centroids.json    -> region centroids
//   GET /mesh/:file.ply                -> cortical surface mesh

import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(ROOT, "public", "demo-data", "api");
const MESH_DIR = join(ROOT, "public", "demo-data", "mesh");
const PORT = Number(process.env.PORT ?? 8787);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, ...CORS });
  res.end(body);
}

async function serveFile(res, path, type) {
  try {
    send(res, 200, await readFile(path), type);
  } catch {
    send(res, 404, JSON.stringify({ error: "not_found", path: basename(path) }));
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "");
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/health") return send(res, 200, JSON.stringify({ status: "ok", service: "imaging-analysis" }));

  if (path === "/cases") {
    try {
      const files = await readdir(API_DIR);
      const cases = files.filter((f) => f.startsWith("analysis-") && f.endsWith(".json")).map((f) => ({ case_id: f.slice("analysis-".length, -".json".length) }));
      return send(res, 200, JSON.stringify(cases));
    } catch {
      return send(res, 500, JSON.stringify({ error: "list_failed" }));
    }
  }

  const analysisMatch = path.match(/^\/cases\/([^/]+)\/imaging-analysis$/);
  if (analysisMatch) return serveFile(res, join(API_DIR, `analysis-${analysisMatch[1]}.json`), "application/json");

  if (path === "/mesh/region_centroids.json") return serveFile(res, join(MESH_DIR, "region_centroids.json"), "application/json");

  const meshMatch = path.match(/^\/mesh\/([\w.-]+\.ply)$/);
  if (meshMatch) return serveFile(res, join(MESH_DIR, meshMatch[1]), "application/octet-stream");

  send(res, 404, JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  console.log(`imaging-analysis reference server on http://localhost:${PORT}`);
  console.log(`  GET /cases/<id>/imaging-analysis`);
});
