/**
 * Analyze Transcript Command
 *
 * Analyzes a call transcript and provides structured insights.
 * Usage: retell transcripts analyze <call_id>
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

// ===== CONSTANTS =====

/**
 * Default threshold values for hotspot detection
 */
export const DEFAULT_LATENCY_THRESHOLD = 2000; // ms
export const DEFAULT_SILENCE_THRESHOLD = 5000; // ms

// ===== TYPES =====

/**
 * Retell API Call Response structure (subset of fields used for hotspot detection)
 */
interface CallResponse {
  call_id?: string;
  call_status?: string;
  duration_ms?: number;
  start_timestamp?: number;
  end_timestamp?: number;
  agent_name?: string;
  transcript_object?: Array<{
    role: "agent" | "user";
    content: string;
    words?: Array<{
      start: number; // seconds
      end: number; // seconds
      word: string;
    }>;
  }>;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
    in_voicemail?: boolean;
  };
  latency?: {
    e2e?: {
      p50?: number;
      p90?: number;
    };
    llm?: {
      p50?: number;
      p90?: number;
    };
    tts?: {
      p50?: number;
      p90?: number;
    };
  };
  call_cost?: {
    combined_cost?: number;
    product_costs?: Array<{ product: string; cost: number }>;
  };
}

interface TranscriptTurn {
  role: "agent" | "user";
  content: string;
  word_count: number;
}

/**
 * Represents a detected issue in a conversation
 */
interface HotspotIssue {
  turn_index: number; // Position in transcript (-1 for overall metrics)
  timestamp: string; // Human-readable timestamp (HH:MM:SS or "N/A")
  issue_type: "latency_spike" | "long_silence" | "sentiment";
  user_utterance?: string; // User's text at this point
  agent_utterance?: string; // Agent's text at this point
  metrics?: Record<string, number | string>; // Relevant metrics (latency, duration, etc.)
}

/**
 * Configuration for hotspot detection thresholds
 */
interface HotspotConfig {
  latencyThreshold: number; // ms, default 2000
  silenceThreshold: number; // ms, default 5000
}

interface AnalysisOutput {
  call_id: string;
  metadata: {
    status: string;
    duration_ms: number;
    start_timestamp: number;
    end_timestamp: number;
    agent_name: string;
  };
  transcript: TranscriptTurn[];
  analysis: {
    summary: string;
    sentiment: string;
    successful: boolean;
    in_voicemail: boolean;
  };
  performance: {
    latency_p50_ms: {
      e2e: number | null;
      llm: number | null;
      tts: number | null;
    };
    latency_p90_ms: {
      e2e: number | null;
      llm: number | null;
      tts: number | null;
    };
  };
  cost: {
    total: number;
    breakdown: Array<{ product: string; cost: number }>;
  };
}

export interface AnalyzeTranscriptOptions {
  fields?: string;
  raw?: boolean;
  hotspotsOnly?: boolean; // Add this
  latencyThreshold?: number; // Add this (optional)
  silenceThreshold?: number; // Add this (optional)
}

// ===== HELPER FUNCTIONS =====

/**
 * Validates threshold values
 * @throws Error if threshold is not a positive integer
 */
function validateThreshold(threshold: number, name: string): void {
  if (!Number.isInteger(threshold) || threshold <= 0) {
    throw new Error(`${name} must be a positive integer (got: ${threshold})`);
  }
}

/**
 * Extract transcript turns from transcript_object
 */
function extractTranscriptTurns(transcriptObject: any[]): TranscriptTurn[] {
  if (!transcriptObject || !Array.isArray(transcriptObject)) {
    return [];
  }

  return transcriptObject.map((turn) => ({
    role: turn.role,
    content: turn.content,
    word_count: turn.content ? turn.content.split(/\s+/).length : 0,
  }));
}

/**
 * Format timestamp to human-readable format (HH:MM:SS or MM:SS)
 * @param seconds Timestamp in seconds (from word-level timing)
 */
function formatTimestamp(seconds: number): string {
  if (!seconds || seconds < 0) return "N/A";

  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const hrs = Math.floor(mins / 60);
  const displayMins = mins % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${displayMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${displayMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Detect latency spikes in call performance
 */
function detectLatencySpikes(
  call: CallResponse,
  config: HotspotConfig,
): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];

  // Check overall p90 latency metrics
  if (
    call.latency?.e2e?.p90 &&
    call.latency.e2e.p90 > config.latencyThreshold
  ) {
    hotspots.push({
      turn_index: -1,
      timestamp: "N/A",
      issue_type: "latency_spike",
      metrics: {
        latency_p90_e2e: call.latency.e2e.p90,
        latency_p90_llm: call.latency?.llm?.p90 || 0,
        latency_p90_tts: call.latency?.tts?.p90 || 0,
      },
    });
  }

  return hotspots;
}

/**
 * Detect long silences between conversation turns
 */
function detectLongSilences(
  call: CallResponse,
  config: HotspotConfig,
): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];
  const transcript = call.transcript_object || [];

  for (let i = 1; i < transcript.length; i++) {
    const prevTurn = transcript[i - 1];
    const currTurn = transcript[i];

    // Get last word of previous turn and first word of current turn
    const prevWords = prevTurn.words || [];
    const currWords = currTurn.words || [];

    if (prevWords.length === 0 || currWords.length === 0) continue;

    // Add null safety checks for word timing data
    const prevEnd = prevWords[prevWords.length - 1]?.end;
    const currStart = currWords[0]?.start;

    // Skip if timing data is missing
    if (prevEnd === undefined || currStart === undefined) continue;

    const gapMs = (currStart - prevEnd) * 1000; // convert to ms

    if (gapMs > config.silenceThreshold) {
      hotspots.push({
        turn_index: i,
        timestamp: formatTimestamp(currStart),
        issue_type: "long_silence",
        user_utterance:
          prevTurn.role === "user" ? prevTurn.content : currTurn.content,
        agent_utterance:
          currTurn.role === "agent" ? currTurn.content : prevTurn.content,
        metrics: {
          silence_duration_ms: Math.round(gapMs),
        },
      });
    }
  }

  return hotspots;
}

/**
 * Detect sentiment issues in the conversation
 */
function detectSentimentIssues(call: CallResponse): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];

  // Check overall sentiment
  if (call.call_analysis?.user_sentiment === "Negative") {
    hotspots.push({
      turn_index: -1,
      timestamp: "N/A",
      issue_type: "sentiment",
      metrics: {
        sentiment: call.call_analysis.user_sentiment,
      },
    });
  }

  return hotspots;
}

/**
 * Detect all hotspots in a call
 */
function detectAllHotspots(
  call: CallResponse,
  config: HotspotConfig,
): HotspotIssue[] {
  const hotspots = [
    ...detectLatencySpikes(call, config),
    ...detectLongSilences(call, config),
    ...detectSentimentIssues(call),
  ];

  // Sort by turn_index (overall metrics with -1 go first)
  return hotspots.sort((a, b) => {
    if (a.turn_index === -1) return -1;
    if (b.turn_index === -1) return 1;
    return a.turn_index - b.turn_index;
  });
}

// ===== COMMAND IMPLEMENTATION =====

/**
 * Analyze a call transcript with structured insights
 *
 * @param callId The call ID to analyze
 * @param options Command options (fields)
 */
export async function analyzeTranscriptCommand(
  callId: string,
  options: AnalyzeTranscriptOptions = {},
): Promise<void> {
  try {
    // Validate threshold values inside try/catch so errors are formatted consistently
    if (options.hotspotsOnly) {
      const latencyThreshold =
        options.latencyThreshold ?? DEFAULT_LATENCY_THRESHOLD;
      const silenceThreshold =
        options.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD;

      validateThreshold(latencyThreshold, "Latency threshold");
      validateThreshold(silenceThreshold, "Silence threshold");
    }

    const client = getRetellClient();

    // Retrieve the call from the API
    const call = await client.call.retrieve(callId);

    // If --raw flag is set, return unmodified API response
    if (options.raw) {
      const output = options.fields
        ? filterFields(
            call,
            options.fields.split(",").map((f) => f.trim()),
          )
        : call;
      outputJson(output);
      return;
    }

    // If --hotspots-only flag is set, detect and return conversation issues
    if (options.hotspotsOnly) {
      const config: HotspotConfig = {
        latencyThreshold: options.latencyThreshold ?? DEFAULT_LATENCY_THRESHOLD,
        silenceThreshold: options.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD,
      };

      const hotspots = detectAllHotspots(call as any, config);

      const result = {
        call_id: callId,
        hotspots: hotspots,
      };

      const output = options.fields
        ? filterFields(
            result,
            options.fields.split(",").map((f) => f.trim()),
          )
        : result;

      outputJson(output);
      return;
    }

    // Build structured analysis output
    const analysis: AnalysisOutput = {
      call_id: callId,
      metadata: {
        status: call.call_status || "unknown",
        duration_ms: call.duration_ms || 0,
        start_timestamp: call.start_timestamp || 0,
        end_timestamp: call.end_timestamp || 0,
        agent_name: call.agent_name || "Unknown",
      },
      transcript: extractTranscriptTurns(call.transcript_object as any),
      analysis: {
        summary: call.call_analysis?.call_summary || "No summary available",
        sentiment: call.call_analysis?.user_sentiment || "Unknown",
        successful: call.call_analysis?.call_successful ?? false,
        in_voicemail: call.call_analysis?.in_voicemail ?? false,
      },
      performance: {
        latency_p50_ms: {
          e2e: call.latency?.e2e?.p50 ?? null,
          llm: call.latency?.llm?.p50 ?? null,
          tts: call.latency?.tts?.p50 ?? null,
        },
        latency_p90_ms: {
          e2e: call.latency?.e2e?.p90 ?? null,
          llm: call.latency?.llm?.p90 ?? null,
          tts: call.latency?.tts?.p90 ?? null,
        },
      },
      cost: {
        total: call.call_cost?.combined_cost || 0,
        breakdown: call.call_cost?.product_costs || [],
      },
    };

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          analysis,
          options.fields.split(",").map((f) => f.trim()),
        )
      : analysis;

    // Output structured analysis
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
