import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKnowledgeBaseCommand } from "./create";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";
import * as uploadFiles from "../../services/upload-files";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    outputError: vi.fn(),
    handleSdkError: vi.fn(),
  };
});
vi.mock("../../services/upload-files");

describe("createKnowledgeBaseCommand", () => {
  let mockClient: any;
  const streams = [{} as any];

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      knowledgeBase: {
        create: vi.fn().mockResolvedValue({
          knowledge_base_id: "kb_1",
          knowledge_base_name: "Support",
          status: "in_progress",
          knowledge_base_sources: [],
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
    vi.mocked(uploadFiles.loadUploadFiles).mockReturnValue(streams);
  });

  it("adds files and validated chunk settings", async () => {
    await createKnowledgeBaseCommand({
      name: "Support",
      files: ["handbook.pdf"],
      minChunkSize: "400",
      maxChunkSize: "2400",
    });
    expect(uploadFiles.loadUploadFiles).toHaveBeenCalledWith(["handbook.pdf"]);
    expect(mockClient.knowledgeBase.create).toHaveBeenCalledWith({
      knowledge_base_name: "Support",
      knowledge_base_files: streams,
      min_chunk_size: 400,
      max_chunk_size: 2400,
    });
  });

  it("rejects invalid chunk ranges", async () => {
    await createKnowledgeBaseCommand({
      name: "Support",
      minChunkSize: "1200",
      maxChunkSize: "1000",
    });
    expect(mockClient.knowledgeBase.create).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
