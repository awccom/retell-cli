import { beforeEach, describe, expect, it, vi } from "vitest";
import { addKnowledgeBaseSourcesCommand } from "./add";
import * as retellClient from "../../../services/retell-client";
import * as outputFormatter from "../../../services/output-formatter";
import * as uploadFiles from "../../../services/upload-files";

vi.mock("../../../services/retell-client");
vi.mock("../../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    outputError: vi.fn(),
    handleSdkError: vi.fn(),
  };
});
vi.mock("../../../services/upload-files");

describe("addKnowledgeBaseSourcesCommand", () => {
  let mockClient: any;
  const streams = [{} as any];

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      knowledgeBase: {
        addSources: vi.fn().mockResolvedValue({
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

  it("adds uploaded files", async () => {
    await addKnowledgeBaseSourcesCommand("kb_1", {
      files: ["policy.pdf"],
    });
    expect(mockClient.knowledgeBase.addSources).toHaveBeenCalledWith("kb_1", {
      knowledge_base_files: streams,
    });
  });

  it("requires at least one source", async () => {
    await addKnowledgeBaseSourcesCommand("kb_1", {});
    expect(mockClient.knowledgeBase.addSources).not.toHaveBeenCalled();
    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      "At least one of --urls, --texts, or --file must be provided",
      "MISSING_SOURCES",
    );
  });
});
