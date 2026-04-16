import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createBatchCallCommand } from "./create";
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

describe("createBatchCallCommand", () => {
  let mockClient: any;
  const tasksPath = join(tmpdir(), `retell-cli-tasks-${process.pid}.json`);
  const windowPath = join(tmpdir(), `retell-cli-window-${process.pid}.json`);

  const mockResponse = { batch_call_id: "bc_1", total_task_count: 2 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      batchCall: {
        createBatchCall: vi.fn().mockResolvedValue(mockResponse),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    if (existsSync(tasksPath)) unlinkSync(tasksPath);
    if (existsSync(windowPath)) unlinkSync(windowPath);
  });

  it("creates a batch call with from-number and tasks", async () => {
    writeFileSync(tasksPath, JSON.stringify([{ to_number: "+12137774445" }]));
    await createBatchCallCommand({
      fromNumber: "+14157774444",
      tasks: tasksPath,
    });
    expect(mockClient.batchCall.createBatchCall).toHaveBeenCalledWith({
      from_number: "+14157774444",
      tasks: [{ to_number: "+12137774445" }],
    });
  });

  it("rejects non-array --tasks content", async () => {
    writeFileSync(tasksPath, JSON.stringify({ not: "array" }));
    await createBatchCallCommand({
      fromNumber: "+1",
      tasks: tasksPath,
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("reads --call-time-window from file", async () => {
    writeFileSync(tasksPath, JSON.stringify([{ to_number: "+1" }]));
    writeFileSync(
      windowPath,
      JSON.stringify({
        windows: [{ start: 540, end: 1020 }],
        timezone: "America/Los_Angeles",
      }),
    );
    await createBatchCallCommand({
      fromNumber: "+1",
      tasks: tasksPath,
      callTimeWindow: windowPath,
    });
    expect(mockClient.batchCall.createBatchCall).toHaveBeenCalledWith(
      expect.objectContaining({
        call_time_window: {
          windows: [{ start: 540, end: 1020 }],
          timezone: "America/Los_Angeles",
        },
      }),
    );
  });

  it("rejects non-numeric --trigger-timestamp", async () => {
    writeFileSync(tasksPath, JSON.stringify([{ to_number: "+1" }]));
    await createBatchCallCommand({
      fromNumber: "+1",
      tasks: tasksPath,
      triggerTimestamp: "tomorrow",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --from-number", async () => {
    writeFileSync(tasksPath, JSON.stringify([{ to_number: "+1" }]));
    await createBatchCallCommand({ fromNumber: "", tasks: tasksPath });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.batchCall.createBatchCall).not.toHaveBeenCalled();
  });
});
