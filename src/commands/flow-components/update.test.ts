import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { updateFlowComponentCommand } from "./update";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data, _fields) => data),
  };
});

describe("updateFlowComponentCommand", () => {
  let mockClient: any;
  const tmpFile = join(tmpdir(), `retell-cli-fc-update-${process.pid}.json`);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      conversationFlowComponent: {
        update: vi
          .fn()
          .mockResolvedValue({ conversation_flow_component_id: "c_1" }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it("sends body from --file", async () => {
    writeFileSync(tmpFile, JSON.stringify({ name: "new name" }));
    await updateFlowComponentCommand("c_1", { file: tmpFile });
    expect(mockClient.conversationFlowComponent.update).toHaveBeenCalledWith(
      "c_1",
      { name: "new name" },
    );
  });

  it("rejects a non-object JSON file body", async () => {
    writeFileSync(tmpFile, JSON.stringify([1, 2, 3]));
    await updateFlowComponentCommand("c_1", { file: tmpFile });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.conversationFlowComponent.update).not.toHaveBeenCalled();
  });

  it("routes SDK errors through handleSdkError", async () => {
    writeFileSync(tmpFile, JSON.stringify({ name: "x" }));
    mockClient.conversationFlowComponent.update.mockRejectedValue(
      new Error("api"),
    );
    await updateFlowComponentCommand("c_1", { file: tmpFile });
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });

  it("rejects empty body file", async () => {
    writeFileSync(tmpFile, JSON.stringify({}));
    await updateFlowComponentCommand("c_1", { file: tmpFile });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.conversationFlowComponent.update).not.toHaveBeenCalled();
  });
});
