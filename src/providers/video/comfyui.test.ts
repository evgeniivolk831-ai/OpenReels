import { afterEach, describe, expect, it } from "vitest";
import { ComfyUIVideo } from "./comfyui.js";

const originalUrl = process.env["COMFYUI_URL"];
const originalWorkflow = process.env["COMFYUI_WORKFLOW_PATH"];
const originalWidth = process.env["COMFYUI_WIDTH"];
const originalHeight = process.env["COMFYUI_HEIGHT"];
const originalFps = process.env["COMFYUI_FPS"];
const originalFrameStep = process.env["COMFYUI_FRAME_STEP"];

afterEach(() => {
  if (originalUrl === undefined) delete process.env["COMFYUI_URL"];
  else process.env["COMFYUI_URL"] = originalUrl;
  if (originalWorkflow === undefined) delete process.env["COMFYUI_WORKFLOW_PATH"];
  else process.env["COMFYUI_WORKFLOW_PATH"] = originalWorkflow;
  for (const [key, value] of Object.entries({ COMFYUI_WIDTH: originalWidth, COMFYUI_HEIGHT: originalHeight, COMFYUI_FPS: originalFps, COMFYUI_FRAME_STEP: originalFrameStep })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("ComfyUIVideo", () => {
  it("requires an endpoint and API workflow", () => {
    delete process.env["COMFYUI_URL"];
    delete process.env["COMFYUI_WORKFLOW_PATH"];
    expect(() => new ComfyUIVideo()).toThrow("COMFYUI_URL is required");
  });

  it("rejects non-http endpoints", () => {
    expect(() => new ComfyUIVideo("file:///tmp/comfy", "./workflow.json")).toThrow("http or https");
  });

  it("accepts a configured ComfyUI endpoint", () => {
    const provider = new ComfyUIVideo("http://localhost:8188", "./workflow.json");
    expect(provider.supportedDurations).toEqual([5, 10]);
  });

  it("accepts Wan-style resolution and frame settings from the environment", () => {
    process.env["COMFYUI_WIDTH"] = "832";
    process.env["COMFYUI_HEIGHT"] = "480";
    process.env["COMFYUI_FPS"] = "16";
    process.env["COMFYUI_FRAME_STEP"] = "4";
    expect(() => new ComfyUIVideo("http://localhost:8188", "./wan-vace-api.json")).not.toThrow();
  });
});
