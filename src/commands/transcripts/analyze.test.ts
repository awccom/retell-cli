/**
 * Integration tests for analyze transcript command
 *
 * Tests the --raw flag and field filtering functionality:
 * - Raw mode returns unmodified API response
 * - Raw mode combined with --fields for filtering
 * - Default enriched mode behavior
 * - Error handling consistency
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyzeTranscriptCommand,
  DEFAULT_LATENCY_THRESHOLD,
  DEFAULT_SILENCE_THRESHOLD,
} from "./analyze";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

// Mock the dependencies
vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

describe("analyzeTranscriptCommand", () => {
  // Mock call object that mimics Retell API response
  const mockCallData = {
    call_id: "call_abc123",
    call_status: "ended",
    agent_id: "agent_123",
    agent_name: "Test Agent",
    duration_ms: 45000,
    start_timestamp: 1234567890,
    end_timestamp: 1234612890,
    transcript: "Full transcript text here...",
    transcript_object: [
      { role: "agent", content: "Hello, how can I help you today?" },
      { role: "user", content: "I need help with my account." },
      { role: "agent", content: "I can help with that." },
    ],
    call_analysis: {
      call_summary: "Customer inquiry about account issues",
      user_sentiment: "neutral",
      call_successful: true,
      in_voicemail: false,
    },
    latency: {
      e2e: { p50: 250, p90: 400 },
      llm: { p50: 150, p90: 250 },
      tts: { p50: 100, p90: 150 },
    },
    call_cost: {
      combined_cost: 0.05,
      product_costs: [
        { product: "llm", cost: 0.03 },
        { product: "tts", cost: 0.02 },
      ],
    },
  };

  let mockClient: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup mock client
    mockClient = {
      call: {
        retrieve: vi.fn().mockResolvedValue(mockCallData),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe("raw mode functionality", () => {
    it("should return unmodified API response when --raw flag is set", async () => {
      await analyzeTranscriptCommand("call_abc123", { raw: true });

      // Verify the API was called
      expect(mockClient.call.retrieve).toHaveBeenCalledWith("call_abc123");

      // Verify outputJson was called with the raw API response (not enriched)
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCallData);
    });

    it("should return enriched analysis when --raw flag is not set", async () => {
      await analyzeTranscriptCommand("call_abc123", {});

      // Verify the API was called
      expect(mockClient.call.retrieve).toHaveBeenCalledWith("call_abc123");

      // Verify outputJson was called with enriched data (not raw)
      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(outputCall).toHaveProperty("call_id");
      expect(outputCall).toHaveProperty("metadata");
      expect(outputCall).toHaveProperty("transcript");
      expect(outputCall).toHaveProperty("analysis");
      expect(outputCall).toHaveProperty("performance");
      expect(outputCall).toHaveProperty("cost");

      // Verify it's the enriched format (has metadata key, not raw fields)
      expect(outputCall.metadata).toBeDefined();
      expect(outputCall.metadata.agent_name).toBe("Test Agent");
    });

    it("should combine --raw with --fields for filtered raw output", async () => {
      await analyzeTranscriptCommand("call_abc123", {
        raw: true,
        fields: "call_id,transcript_object",
      });

      // Verify outputJson was called with filtered raw data
      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(outputCall).toHaveProperty("call_id");
      expect(outputCall).toHaveProperty("transcript_object");
      expect(outputCall).not.toHaveProperty("call_status");
      expect(outputCall).not.toHaveProperty("agent_id");
    });

    it("should handle --fields with nested paths in raw mode", async () => {
      await analyzeTranscriptCommand("call_abc123", {
        raw: true,
        fields: "call_id,call_analysis.call_summary",
      });

      // Verify outputJson was called with filtered nested data
      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(outputCall).toHaveProperty("call_id");
      expect(outputCall).toHaveProperty("call_analysis");
      expect(outputCall.call_analysis).toHaveProperty("call_summary");
      expect(outputCall.call_analysis.call_summary).toBe(
        "Customer inquiry about account issues",
      );
    });
  });

  describe("field filtering in enriched mode", () => {
    it("should filter enriched analysis when --fields is specified without --raw", async () => {
      await analyzeTranscriptCommand("call_abc123", {
        fields: "call_id,performance",
      });

      // Verify outputJson was called with filtered enriched data
      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(outputCall).toHaveProperty("call_id");
      expect(outputCall).toHaveProperty("performance");
      expect(outputCall).not.toHaveProperty("metadata");
      expect(outputCall).not.toHaveProperty("transcript");
    });
  });

  describe("error handling", () => {
    it("should handle API errors consistently in raw mode", async () => {
      const mockError = new Error("API Error: Call not found");
      mockClient.call.retrieve.mockRejectedValue(mockError);

      await analyzeTranscriptCommand("call_invalid", { raw: true });

      // Verify handleSdkError was called with the error
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(mockError);
    });

    it("should handle API errors consistently in enriched mode", async () => {
      const mockError = new Error("API Error: Call not found");
      mockClient.call.retrieve.mockRejectedValue(mockError);

      await analyzeTranscriptCommand("call_invalid", {});

      // Verify handleSdkError was called with the error
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(mockError);
    });

    it("should handle network errors in raw mode", async () => {
      const networkError = new Error("Network timeout");
      mockClient.call.retrieve.mockRejectedValue(networkError);

      await analyzeTranscriptCommand("call_abc123", { raw: true });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(networkError);
    });
  });

  describe("edge cases", () => {
    it("should handle raw mode with empty transcript_object", async () => {
      const emptyTranscriptData = {
        ...mockCallData,
        transcript_object: [],
      };
      mockClient.call.retrieve.mockResolvedValue(emptyTranscriptData);

      await analyzeTranscriptCommand("call_abc123", { raw: true });

      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(outputCall.transcript_object).toEqual([]);
    });

    it("should handle raw mode with null values", async () => {
      const nullValueData = {
        ...mockCallData,
        call_analysis: null,
        latency: null,
      };
      mockClient.call.retrieve.mockResolvedValue(nullValueData);

      await analyzeTranscriptCommand("call_abc123", { raw: true });

      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(outputCall.call_analysis).toBeNull();
      expect(outputCall.latency).toBeNull();
    });

    it("should handle enriched mode with missing optional fields", async () => {
      const minimalData = {
        call_id: "call_abc123",
        call_status: "ended",
        // Missing optional fields
      };
      mockClient.call.retrieve.mockResolvedValue(minimalData);

      await analyzeTranscriptCommand("call_abc123", {});

      // Should not throw, and should handle missing fields gracefully
      expect(outputFormatter.outputJson).toHaveBeenCalled();
      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(outputCall).toHaveProperty("call_id");
      expect(outputCall).toHaveProperty("metadata");
    });
  });

  describe("data transformation validation", () => {
    it("should NOT transform transcript_object in raw mode", async () => {
      await analyzeTranscriptCommand("call_abc123", { raw: true });

      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;

      // Raw mode should return exact transcript_object from API
      expect(outputCall.transcript_object).toEqual(
        mockCallData.transcript_object,
      );

      // Verify it's the exact same structure (no word_count added)
      expect(outputCall.transcript_object[0]).not.toHaveProperty("word_count");
    });

    it("should transform transcript_object in enriched mode", async () => {
      await analyzeTranscriptCommand("call_abc123", {});

      const outputCall = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;

      // Enriched mode should transform transcript with word_count
      expect(outputCall.transcript).toBeDefined();
      expect(outputCall.transcript[0]).toHaveProperty("word_count");
      expect(outputCall.transcript[0].word_count).toBeGreaterThan(0);
    });
  });

  describe("hotspot detection functionality", () => {
    describe("latency spike detection", () => {
      it("should detect latency spikes when p90 exceeds threshold", async () => {
        const highLatencyData = {
          ...mockCallData,
          latency: {
            e2e: { p50: 1000, p90: 3000 }, // Above default threshold of 2000ms
            llm: { p50: 500, p90: 1500 },
            tts: { p50: 200, p90: 800 },
          },
        };
        mockClient.call.retrieve.mockResolvedValue(highLatencyData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        expect(outputCall).toHaveProperty("hotspots");
        expect(outputCall.hotspots).toBeInstanceOf(Array);
        expect(outputCall.hotspots.length).toBeGreaterThan(0);

        const latencyHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "latency_spike",
        );
        expect(latencyHotspot).toBeDefined();
        expect(latencyHotspot.turn_index).toBe(-1); // Overall metric
        expect(latencyHotspot.metrics.latency_p90_e2e).toBe(3000);
      });

      it("should not detect latency spikes when below threshold", async () => {
        const lowLatencyData = {
          ...mockCallData,
          latency: {
            e2e: { p50: 250, p90: 400 }, // Below default threshold
            llm: { p50: 150, p90: 250 },
            tts: { p50: 100, p90: 150 },
          },
        };
        mockClient.call.retrieve.mockResolvedValue(lowLatencyData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const latencyHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "latency_spike",
        );
        expect(latencyHotspot).toBeUndefined();
      });

      it("should respect custom latency threshold", async () => {
        const customThresholdData = {
          ...mockCallData,
          latency: {
            e2e: { p50: 500, p90: 1200 }, // Below default 2000ms, but above custom 1000ms
            llm: { p50: 300, p90: 600 },
            tts: { p50: 200, p90: 300 },
          },
        };
        mockClient.call.retrieve.mockResolvedValue(customThresholdData);

        await analyzeTranscriptCommand("call_abc123", {
          hotspotsOnly: true,
          latencyThreshold: 1000,
        });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const latencyHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "latency_spike",
        );
        expect(latencyHotspot).toBeDefined();
        expect(latencyHotspot.metrics.latency_p90_e2e).toBe(1200);
      });
    });

    describe("long silence detection", () => {
      it("should detect long silences between turns", async () => {
        const silenceData = {
          ...mockCallData,
          transcript_object: [
            {
              role: "agent",
              content: "Hello",
              words: [{ word: "Hello", start: 0, end: 0.5 }],
            },
            {
              role: "user",
              content: "Hi there",
              words: [
                { word: "Hi", start: 7.5, end: 7.8 }, // 7 second gap
                { word: "there", start: 7.8, end: 8.2 },
              ],
            },
          ],
        };
        mockClient.call.retrieve.mockResolvedValue(silenceData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const silenceHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "long_silence",
        );
        expect(silenceHotspot).toBeDefined();
        expect(silenceHotspot.metrics.silence_duration_ms).toBe(7000);
      });

      it("should not detect silences below threshold", async () => {
        const normalData = {
          ...mockCallData,
          transcript_object: [
            {
              role: "agent",
              content: "Hello",
              words: [{ word: "Hello", start: 0, end: 0.5 }],
            },
            {
              role: "user",
              content: "Hi",
              words: [{ word: "Hi", start: 1.0, end: 1.3 }], // Only 0.5 second gap
            },
          ],
        };
        mockClient.call.retrieve.mockResolvedValue(normalData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const silenceHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "long_silence",
        );
        expect(silenceHotspot).toBeUndefined();
      });

      it("should handle missing word timing data gracefully", async () => {
        const noTimingData = {
          ...mockCallData,
          transcript_object: [
            { role: "agent", content: "Hello", words: [] },
            { role: "user", content: "Hi", words: [] },
          ],
        };
        mockClient.call.retrieve.mockResolvedValue(noTimingData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        // Should not throw error
        expect(outputFormatter.outputJson).toHaveBeenCalled();
        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const silenceHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "long_silence",
        );
        expect(silenceHotspot).toBeUndefined();
      });

      it("should handle undefined timing values in words array", async () => {
        const undefinedTimingData = {
          ...mockCallData,
          transcript_object: [
            {
              role: "agent",
              content: "Hello",
              words: [{ word: "Hello", start: 0, end: undefined }],
            },
            {
              role: "user",
              content: "Hi",
              words: [{ word: "Hi", start: undefined, end: 1.3 }],
            },
          ],
        };
        mockClient.call.retrieve.mockResolvedValue(undefinedTimingData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        // Should not throw error
        expect(outputFormatter.outputJson).toHaveBeenCalled();
        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const silenceHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "long_silence",
        );
        expect(silenceHotspot).toBeUndefined();
      });

      it("should respect custom silence threshold", async () => {
        const customSilenceData = {
          ...mockCallData,
          transcript_object: [
            {
              role: "agent",
              content: "Hello",
              words: [{ word: "Hello", start: 0, end: 0.5 }],
            },
            {
              role: "user",
              content: "Hi",
              words: [{ word: "Hi", start: 3.5, end: 3.8 }], // 3 second gap
            },
          ],
        };
        mockClient.call.retrieve.mockResolvedValue(customSilenceData);

        await analyzeTranscriptCommand("call_abc123", {
          hotspotsOnly: true,
          silenceThreshold: 2000, // 2 seconds
        });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const silenceHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "long_silence",
        );
        expect(silenceHotspot).toBeDefined();
        expect(silenceHotspot.metrics.silence_duration_ms).toBe(3000);
      });
    });

    describe("sentiment detection", () => {
      it("should detect negative sentiment", async () => {
        const negativeSentimentData = {
          ...mockCallData,
          call_analysis: {
            ...mockCallData.call_analysis,
            user_sentiment: "Negative",
          },
        };
        mockClient.call.retrieve.mockResolvedValue(negativeSentimentData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const sentimentHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "sentiment",
        );
        expect(sentimentHotspot).toBeDefined();
        expect(sentimentHotspot.metrics.sentiment).toBe("Negative");
      });

      it("should not detect positive or neutral sentiment", async () => {
        const positiveSentimentData = {
          ...mockCallData,
          call_analysis: {
            ...mockCallData.call_analysis,
            user_sentiment: "Positive",
          },
        };
        mockClient.call.retrieve.mockResolvedValue(positiveSentimentData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        const sentimentHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "sentiment",
        );
        expect(sentimentHotspot).toBeUndefined();
      });
    });

    describe("combined hotspot detection", () => {
      it("should detect multiple hotspot types simultaneously", async () => {
        const multipleIssuesData = {
          ...mockCallData,
          latency: {
            e2e: { p50: 1500, p90: 3000 }, // High latency
            llm: { p50: 800, p90: 1500 },
            tts: { p50: 300, p90: 600 },
          },
          call_analysis: {
            ...mockCallData.call_analysis,
            user_sentiment: "Negative", // Negative sentiment
          },
          transcript_object: [
            {
              role: "agent",
              content: "Hello",
              words: [{ word: "Hello", start: 0, end: 0.5 }],
            },
            {
              role: "user",
              content: "Finally!",
              words: [{ word: "Finally", start: 8.5, end: 9.0 }], // Long silence
            },
          ],
        };
        mockClient.call.retrieve.mockResolvedValue(multipleIssuesData);

        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        expect(outputCall.hotspots.length).toBeGreaterThanOrEqual(3);

        const latencyHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "latency_spike",
        );
        const silenceHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "long_silence",
        );
        const sentimentHotspot = outputCall.hotspots.find(
          (h: any) => h.issue_type === "sentiment",
        );

        expect(latencyHotspot).toBeDefined();
        expect(silenceHotspot).toBeDefined();
        expect(sentimentHotspot).toBeDefined();
      });

      it("should return empty hotspots array when no issues detected", async () => {
        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        expect(outputCall.hotspots).toEqual([]);
      });
    });

    describe("hotspots-only with field filtering", () => {
      it("should work with --fields to return only hotspots", async () => {
        await analyzeTranscriptCommand("call_abc123", {
          hotspotsOnly: true,
          fields: "hotspots",
        });

        const outputCall = vi.mocked(outputFormatter.outputJson).mock
          .calls[0][0] as any;
        expect(outputCall).toHaveProperty("hotspots");
        expect(outputCall).not.toHaveProperty("call_id");
      });
    });

    describe("threshold validation", () => {
      it("should surface negative threshold values via error handler", async () => {
        await analyzeTranscriptCommand("call_abc123", {
          hotspotsOnly: true,
          latencyThreshold: -100,
        });

        expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Latency threshold"),
          }),
        );
      });

      it("should surface zero threshold values via error handler", async () => {
        await analyzeTranscriptCommand("call_abc123", {
          hotspotsOnly: true,
          silenceThreshold: 0,
        });

        expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Silence threshold"),
          }),
        );
      });

      it("should surface non-integer threshold values via error handler", async () => {
        await analyzeTranscriptCommand("call_abc123", {
          hotspotsOnly: true,
          latencyThreshold: 1500.5,
        });

        expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Latency threshold"),
          }),
        );
      });

      it("should use default thresholds when not specified", async () => {
        await analyzeTranscriptCommand("call_abc123", { hotspotsOnly: true });

        // Should not throw and should complete successfully
        expect(outputFormatter.outputJson).toHaveBeenCalled();
      });
    });

    describe("constants", () => {
      it("should export DEFAULT_LATENCY_THRESHOLD", () => {
        expect(DEFAULT_LATENCY_THRESHOLD).toBe(2000);
      });

      it("should export DEFAULT_SILENCE_THRESHOLD", () => {
        expect(DEFAULT_SILENCE_THRESHOLD).toBe(5000);
      });
    });
  });
});
