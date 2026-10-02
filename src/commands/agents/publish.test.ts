import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishAgentCommand } from "../agent/publish";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

/**
 * Mimic the SDK's APIPromise for Retell's publish endpoint, which returns 200
 * with an empty body labelled application/json. Awaiting the promise directly
 * parses that body and throws; asResponse() returns the raw Response.
 */
function publishPromise() {
  const parsed = Promise.reject(
    new SyntaxError("Unexpected end of JSON input"),
  );
  parsed.catch(() => {}); // avoid unhandled-rejection noise when unused
  return Object.assign(parsed, {
    asResponse: () => Promise.resolve(new Response(null, { status: 200 })),
  });
}

/** An APIPromise whose request fails (both await and asResponse reject). */
function failingPromise(error: Error) {
  const rejected = Promise.reject(error);
  rejected.catch(() => {});
  return Object.assign(rejected, { asResponse: () => rejected });
}

describe("publishAgentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      agent: {
        listVersions: vi.fn().mockResolvedValue({
          has_more: false,
          items: [
            { version: 1, is_published: true },
            { version: 5, is_published: false },
            { version: 3, is_published: false },
          ],
        }),
        publish: vi.fn(() => publishPromise()),
        retrieve: vi.fn().mockResolvedValue({
          agent_id: "agent_1",
          agent_name: "Support",
          version: 5,
          is_published: true,
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("publishes the explicit agent version", async () => {
    await publishAgentCommand("agent_1", {
      version: "4",
      description: "Release copy",
      title: "August production release",
    });

    expect(mockClient.agent.publish).toHaveBeenCalledWith("agent_1", {
      version: 4,
      version_description: "Release copy",
      version_title: "August production release",
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent_1",
        version: 5,
        published_version: 4,
      }),
    );
  });

  it("auto-selects the newest unpublished version", async () => {
    await publishAgentCommand("agent_1");

    expect(mockClient.agent.listVersions).toHaveBeenCalledWith("agent_1", {
      limit: 100,
    });
    expect(mockClient.agent.publish).toHaveBeenCalledWith("agent_1", {
      version: 5,
    });
  });

  it("routes publish API errors through handleSdkError", async () => {
    const apiError = new Error("api");
    mockClient.agent.publish.mockImplementation(() => failingPromise(apiError));

    await publishAgentCommand("agent_1", { version: "4" });

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    expect(outputFormatter.outputJson).not.toHaveBeenCalled();
  });

  it("rejects publish when no unpublished draft exists", async () => {
    mockClient.agent.listVersions.mockResolvedValue({
      has_more: false,
      items: [{ version: 1, is_published: true }],
    });

    await publishAgentCommand("agent_1");

    expect(mockClient.agent.publish).not.toHaveBeenCalled();
    expect(mockClient.agent.retrieve).not.toHaveBeenCalled();
    expect(outputFormatter.outputJson).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
