import { afterEach, describe, expect, it } from "vitest";
import { ComfyUIVideo } from "./comfyui.js";

const originalUrl = process.env["COMFYUI_URL"];
const originalWorkflow = process.env["COMFYUI_WORKFLOW_PATH"];

afterEach(() => {
  if (originalUrl === undefined) delete process.env["COMFYUI_URL"];
  else process.env["COMFYUI_URL"] = originalUrl;
  if (originalWorkflow === undefined) delete process.env["COMFYUI_WORKFLOW_PATH"];
  else process.env["COMFYUI_WORKFLOW_PATH"] = originalWorkflow;
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
});
