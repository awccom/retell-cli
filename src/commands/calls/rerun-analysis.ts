/**
 * Rerun Call Analysis Command
 *
 * Reruns paid post-call analysis for an ended call.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  filterFields,
  handleSdkError,
  outputJson,
} from "../../services/output-formatter";

export interface RerunCallAnalysisOptions {
  fields?: string;
}

export async function rerunCallAnalysisCommand(
  callId: string,
  options: RerunCallAnalysisOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const result = await client.call.rerunAnalysis(callId);
    const output = options.fields
      ? filterFields(
          result,
          options.fields.split(",").map((field) => field.trim()),
        )
      : result;
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
