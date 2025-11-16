/**
 * Analyze Transcript Command
 *
 * Analyzes a call transcript and provides structured insights.
 * Usage: retell transcripts analyze <call_id>
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

// ===== TYPES =====

interface TranscriptTurn {
  role: 'agent' | 'user';
  content: string;
  word_count: number;
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

// ===== HELPER FUNCTIONS =====

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

// ===== COMMAND IMPLEMENTATION =====

/**
 * Analyze a call transcript with structured insights
 *
 * @param callId The call ID to analyze
 */
export async function analyzeTranscriptCommand(callId: string): Promise<void> {
  try {
    const client = getRetellClient();

    // Retrieve the call from the API
    const call = await client.call.retrieve(callId);

    // Build structured analysis output
    const analysis: AnalysisOutput = {
      call_id: callId,
      metadata: {
        status: call.call_status || 'unknown',
        duration_ms: call.duration_ms || 0,
        start_timestamp: call.start_timestamp || 0,
        end_timestamp: call.end_timestamp || 0,
        agent_name: call.agent_name || 'Unknown',
      },
      transcript: extractTranscriptTurns(call.transcript_object),
      analysis: {
        summary: call.call_analysis?.call_summary || 'No summary available',
        sentiment: call.call_analysis?.user_sentiment || 'Unknown',
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

    // Output structured analysis
    outputJson(analysis);
  } catch (error) {
    handleSdkError(error);
  }
}
