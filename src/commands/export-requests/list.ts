/**
 * Export Requests List Command
 *
 * Lists export requests with pagination.
 * Usage: retell exports list [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { parseNumericFlag } from "../../services/numeric-flag";
import type { ExportRequestListParams } from "retell-sdk/resources/export-request";

export interface ListExportRequestsOptions {
  limit?: string;
  paginationKey?: string;
  sortOrder?: string;
  fields?: string;
}

const SORT_ORDERS = ["ascending", "descending"] as const;

export async function listExportRequestsCommand(
  options: ListExportRequestsOptions = {},
): Promise<void> {
  try {
    const query: ExportRequestListParams = {};

    if (options.limit !== undefined) {
      const limit = parseNumericFlag(options.limit, "--limit");
      if (!Number.isInteger(limit) || limit < 1) {
        throwValidation("--limit must be a positive integer");
      }
      query.limit = limit;
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.sortOrder !== undefined) {
      if (!SORT_ORDERS.includes(options.sortOrder as never)) {
        throwValidation(
          `--sort-order must be one of: ${SORT_ORDERS.join(", ")}`,
        );
      }
      query.sort_order =
        options.sortOrder as ExportRequestListParams["sort_order"];
    }

    const client = getRetellClient();
    const exportRequests = await client.exportRequest.list(query);

    const output = options.fields
      ? filterFields(
          exportRequests,
          options.fields.split(",").map((f) => f.trim()),
        )
      : exportRequests;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
