/**
 * Unit tests for phone numbers list command
 *
 * Tests listing, formatting, and field filtering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { listPhoneNumbersCommand } from "./list";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

// Mock dependencies
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

describe("listPhoneNumbersCommand", () => {
  let mockClient: any;

  const mockPhoneNumbers = [
    {
      phone_number: "+14157774444",
      phone_number_pretty: "(415) 777-4444",
      phone_number_type: "twilio",
      nickname: "Support Line",
      inbound_agents: [{ agent_id: "agent_123", weight: 1 }],
      outbound_agents: [{ agent_id: "agent_456", weight: 1 }],
      extra_field: "ignored",
    },
    {
      phone_number: "+14157775555",
      phone_number_pretty: "(415) 777-5555",
      phone_number_type: "custom",
      nickname: null,
      inbound_agents: null,
      outbound_agents: null,
      extra_field: "also ignored",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      phoneNumber: {
        list: vi.fn().mockResolvedValue(mockPhoneNumbers),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe("successful listing", () => {
    it("should list phone numbers with formatted output", async () => {
      await listPhoneNumbersCommand();

      expect(mockClient.phoneNumber.list).toHaveBeenCalled();
      expect(outputFormatter.outputJson).toHaveBeenCalledWith([
        {
          phone_number: "+14157774444",
          phone_number_pretty: "(415) 777-4444",
          phone_number_type: "twilio",
          nickname: "Support Line",
          inbound_agents: [{ agent_id: "agent_123", weight: 1 }],
          outbound_agents: [{ agent_id: "agent_456", weight: 1 }],
        },
        {
          phone_number: "+14157775555",
          phone_number_pretty: "(415) 777-5555",
          phone_number_type: "custom",
          nickname: null,
          inbound_agents: [],
          outbound_agents: [],
        },
      ]);
    });

    it("should handle empty phone numbers list", async () => {
      mockClient.phoneNumber.list.mockResolvedValue([]);

      await listPhoneNumbersCommand();

      expect(outputFormatter.outputJson).toHaveBeenCalledWith([]);
    });
  });

  describe("field filtering", () => {
    it("should apply field filtering when --fields is specified", async () => {
      await listPhoneNumbersCommand({ fields: "phone_number,nickname" });

      expect(outputFormatter.filterFields).toHaveBeenCalledWith(
        expect.any(Array),
        ["phone_number", "nickname"],
      );
    });
  });

  describe("error handling", () => {
    it("should handle API errors via handleSdkError", async () => {
      const apiError = new Error("API Error");
      mockClient.phoneNumber.list.mockRejectedValue(apiError);

      await listPhoneNumbersCommand();

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });
});
