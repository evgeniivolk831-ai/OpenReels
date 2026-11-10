import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { VideoProvider, VideoResult } from "../../schema/providers.js";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 2_000;

type Workflow = Record<string, { inputs?: Record<string, unknown>; class_type?: string }>;

function replaceTokens(value: unknown, tokens: Record<string, string | number>): unknown {
  if (typeof value === "string") return tokens[value] === undefined ? value : tokens[value];
  if (Array.isArray(value)) return value.map((item) => replaceTokens(item, tokens));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceTokens(child, tokens)]),
    );
  }
  return value;
}

function findVideoOutput(history: Record<string, unknown>): { filename: string; subfolder: string; type: string } | undefined {
  const outputs = history["outputs"] as Record<string, Record<string, unknown>> | undefined;
  if (!outputs) return undefined;
  for (const node of Object.values(outputs)) {
    for (const key of ["videos", "gifs", "files"]) {
      const files = node[key];
      if (!Array.isArray(files)) continue;
      const match = files.find((file) => {
        if (!file || typeof file !== "object") return false;
        const name = (file as Record<string, unknown>)["filename"];
        return typeof name === "string" && /\.(mp4|webm|mov)$/i.test(name);
      }) as Record<string, unknown> | undefined;
      if (match) {
        return {
          filename: String(match["filename"]),
          subfolder: typeof match["subfolder"] === "string" ? match["subfolder"] : "",
          type: typeof match["type"] === "string" ? match["type"] : "output",
        };
      }
    }
  }
  return undefined;
}

/**
 * ComfyUI adapter for API-format workflows. Put placeholder strings in workflow
 * node inputs: __OPENREELS_PROMPT__, __OPENREELS_IMAGE__, __OPENREELS_NEGATIVE_PROMPT__,
 * __OPENREELS_FRAMES__, __OPENREELS_WIDTH__, __OPENREELS_HEIGHT__.
 */
export class ComfyUIVideo implements VideoProvider {
  readonly supportedDurations = [5, 10];
  private readonly baseUrl: string;
  private readonly workflowPath: string;
  private readonly timeoutMs: number;

  constructor(baseUrl = process.env["COMFYUI_URL"], workflowPath = process.env["COMFYUI_WORKFLOW_PATH"]) {
    if (!baseUrl) throw new Error("COMFYUI_URL is required for ComfyUI video generation");
    if (!workflowPath) throw new Error("COMFYUI_WORKFLOW_PATH is required for ComfyUI video generation");
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("COMFYUI_URL must use http or https");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.workflowPath = workflowPath;
    this.timeoutMs = Number(process.env["COMFYUI_TIMEOUT_MS"] ?? DEFAULT_TIMEOUT_MS);
  }

  private async request(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`ComfyUI request failed (${response.status}): ${await response.text()}`);
    return response;
  }

  async generate(opts: {
    sourceImage: Buffer;
    prompt: string;
    durationSeconds?: number;
    aspectRatio?: string;
    negativePrompt?: string;
  }): Promise<VideoResult> {
    const workflowRaw = await fs.readFile(this.workflowPath, "utf8");
    const workflow = JSON.parse(workflowRaw) as Workflow;
    const imageForm = new FormData();
    imageForm.append("image", new Blob([new Uint8Array(opts.sourceImage)], { type: "image/png" }), "openreels-reference.png");
    imageForm.append("overwrite", "true");
    const uploaded = await (await this.request(`${this.baseUrl}/upload/image`, { method: "POST", body: imageForm })).json() as {
      name?: string; subfolder?: string; type?: string;
    };
    if (!uploaded.name) throw new Error("ComfyUI image upload returned no filename");

    const width = opts.aspectRatio === "16:9" ? 1280 : 720;
    const height = opts.aspectRatio === "16:9" ? 720 : 1280;
    const frames = Math.max(1, Math.round((opts.durationSeconds ?? 5) * 24));
    const prepared = replaceTokens(workflow, {
      "__OPENREELS_PROMPT__": opts.prompt,
      "__OPENREELS_IMAGE__": uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name,
      "__OPENREELS_NEGATIVE_PROMPT__": opts.negativePrompt ?? "",
      "__OPENREELS_FRAMES__": frames,
      "__OPENREELS_WIDTH__": width,
      "__OPENREELS_HEIGHT__": height,
    }) as Workflow;

    const queued = await (await this.request(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prepared, client_id: `openreels-${Date.now()}` }),
    })).json() as { prompt_id?: string; error?: unknown };
    if (!queued.prompt_id) throw new Error(`ComfyUI did not queue workflow: ${JSON.stringify(queued.error ?? queued)}`);

    const deadline = Date.now() + this.timeoutMs;
    let video: { filename: string; subfolder: string; type: string } | undefined;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const history = await (await this.request(`${this.baseUrl}/history/${encodeURIComponent(queued.prompt_id)}`)).json() as Record<string, unknown>;
      const entry = history[queued.prompt_id] as Record<string, unknown> | undefined;
      if (entry) {
        const status = entry["status"] as Record<string, unknown> | undefined;
        if (status?.["status_str"] === "error" || status?.["completed"] === false && status?.["messages"]) {
          throw new Error(`ComfyUI workflow failed: ${JSON.stringify(status["messages"] ?? status)}`);
        }
        video = findVideoOutput(entry);
        if (video) break;
      }
    }
    if (!video) throw new Error(`ComfyUI timed out or produced no video for prompt ${queued.prompt_id}`);

    const params = new URLSearchParams({
      filename: video.filename,
      subfolder: video.subfolder,
      type: video.type,
    });
    const response = await this.request(`${this.baseUrl}/view?${params.toString()}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error("ComfyUI returned an empty video");
    const extension = path.extname(video.filename) || ".mp4";
    const filePath = path.join(os.tmpdir(), `openreels-comfyui-${Date.now()}${extension}`);
    await fs.writeFile(filePath, buffer);
    return { filePath, durationSeconds: opts.durationSeconds ?? 5 };
  }
}
