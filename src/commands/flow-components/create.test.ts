import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createFlowComponentCommand } from "./create";
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

describe("createFlowComponentCommand", () => {
  let mockClient: any;
  const tmpFile = join(tmpdir(), `retell-cli-fc-create-${process.pid}.json`);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      conversationFlowComponent: {
        create: vi
          .fn()
          .mockResolvedValue({ conversation_flow_component_id: "c_1" }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it("creates from --file", async () => {
    writeFileSync(tmpFile, JSON.stringify({ name: "greeter" }));
    await createFlowComponentCommand({ file: tmpFile });
    expect(mockClient.conversationFlowComponent.create).toHaveBeenCalledWith({
      name: "greeter",
    });
  });

  it("rejects missing --file path", async () => {
    await createFlowComponentCommand({ file: "/nonexistent-x.json" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
