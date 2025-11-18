# Retell API Search Capabilities Reference

## Executive Summary

**Good News!** The Retell API's `call.list()` method has extensive built-in filtering capabilities. Almost all filtering can be done server-side via the API, which means better performance and reduced data transfer.

## API-Supported Filters

### call.list() Method Parameters

The `client.call.list()` method accepts a `CallListParams` object with the following structure:

```typescript
interface CallListParams {
  filter_criteria?: FilterCriteria;
  limit?: number;
  pagination_key?: string;
  sort_order?: 'ascending' | 'descending';
}
```

#### 1. limit (number)
- **Supported:** YES ✅
- **Description:** Limit the number of calls returned
- **Default:** 50
- **Max:** 1000
- **Example:**
  ```typescript
  client.call.list({ limit: 100 })
  ```

#### 2. pagination_key (string)
- **Supported:** YES ✅
- **Description:** Continue fetching the next page of calls
- **Note:** Represented by a call id (exclusive - not included in results)
- **Example:**
  ```typescript
  client.call.list({ pagination_key: 'call_abc123' })
  ```

#### 3. sort_order (string)
- **Supported:** YES ✅
- **Options:** 'ascending' | 'descending'
- **Description:** Sort calls by start_timestamp
- **Example:**
  ```typescript
  client.call.list({ sort_order: 'descending' })
  ```

#### 4. filter_criteria (FilterCriteria object)
- **Supported:** YES ✅
- **Description:** Comprehensive filtering options

### FilterCriteria Object - Available Filters

#### agent_id (Array<string>)
- **Supported:** YES ✅
- **Description:** Filter by specific agent(s)
- **Example:**
  ```typescript
  filter_criteria: {
    agent_id: ['agent_123', 'agent_456']
  }
  ```

#### call_status (Array<string>)
- **Supported:** YES ✅
- **Options:** 'registered' | 'not_connected' | 'ongoing' | 'ended' | 'error'
- **Description:** Filter by call status
- **Example:**
  ```typescript
  filter_criteria: {
    call_status: ['error', 'ended']
  }
  ```

#### start_timestamp (StartTimestamp object)
- **Supported:** YES ✅
- **Description:** Filter by date range using Unix timestamps (milliseconds)
- **Interface:**
  ```typescript
  interface StartTimestamp {
    lower_threshold?: number;  // Unix timestamp in ms
    upper_threshold?: number;  // Unix timestamp in ms
  }
  ```
- **Example:**
  ```typescript
  filter_criteria: {
    start_timestamp: {
      lower_threshold: 1730419200000,  // 2025-11-01 00:00:00 UTC
      upper_threshold: 1731628800000   // 2025-11-15 00:00:00 UTC
    }
  }
  ```

#### call_type (Array<string>)
- **Supported:** YES ✅
- **Options:** 'web_call' | 'phone_call'
- **Description:** Filter by call type

#### direction (Array<string>)
- **Supported:** YES ✅
- **Options:** 'inbound' | 'outbound'
- **Description:** Filter by call direction

#### call_successful (Array<boolean>)
- **Supported:** YES ✅
- **Description:** Filter by call success status

#### duration_ms (DurationMs object)
- **Supported:** YES ✅
- **Interface:**
  ```typescript
  interface DurationMs {
    lower_threshold?: number;
    upper_threshold?: number;
  }
  ```

#### Additional Filters Available:
- **batch_call_id** - Array<string>
- **disconnection_reason** - Array<string>
- **from_number** - Array<string>
- **to_number** - Array<string>
- **user_sentiment** - Array<'Negative' | 'Positive' | 'Neutral' | 'Unknown'>
- **in_voicemail** - Array<boolean>
- **version** - Array<number>
- **e2e_latency_p50** - Object with lower_threshold and upper_threshold

## Client-Side Filtering Required For

**GOOD NEWS:** For Phase 5 requirements (status, agent-id, since, until, limit), we can use **100% API filtering**. No client-side filtering needed!

### Why No Client-Side Filtering Needed?

1. **Status filtering** - Supported via `filter_criteria.call_status` array
2. **Agent ID filtering** - Supported via `filter_criteria.agent_id` array
3. **Date range filtering** - Supported via `filter_criteria.start_timestamp` with thresholds
4. **Limit** - Supported via `limit` parameter
5. **Sorting** - Supported via `sort_order` parameter

### Minor Transformation Required:

The API accepts **arrays** for most filters, but our CLI will accept single values for simplicity:
- User provides: `--status error`
- We convert to: `filter_criteria.call_status = ['error']`
- User provides: `--agent-id agent_123`
- We convert to: `filter_criteria.agent_id = ['agent_123']`

## Implementation Strategy

### API Filters (Use These - 100% Coverage!)

```typescript
async function searchTranscripts(options: SearchOptions) {
  const apiParams: CallListParams = {
    limit: options.limit || 50,
  };

  // Build filter_criteria object
  const filterCriteria: any = {};

  // Status filter (convert single value to array)
  if (options.status) {
    filterCriteria.call_status = [options.status];
  }

  // Agent ID filter (convert single value to array)
  if (options.agentId) {
    filterCriteria.agent_id = [options.agentId];
  }

  // Date range filter (convert ISO dates to Unix timestamps)
  if (options.since || options.until) {
    filterCriteria.start_timestamp = {};

    if (options.since) {
      const sinceDate = new Date(options.since);
      filterCriteria.start_timestamp.lower_threshold = sinceDate.getTime();
    }

    if (options.until) {
      const untilDate = new Date(options.until);
      filterCriteria.start_timestamp.upper_threshold = untilDate.getTime();
    }
  }

  // Add filter_criteria to params if any filters were set
  if (Object.keys(filterCriteria).length > 0) {
    apiParams.filter_criteria = filterCriteria;
  }

  // Sort by most recent first (default)
  apiParams.sort_order = 'descending';

  // Fetch from API
  const response = await client.call.list(apiParams);

  return response;
}
```

### Client-Side Filters (None Needed!)

No client-side filtering required for Phase 5 implementation! 🎉

All filters can be pushed to the API, resulting in:
- **Better performance** - API does the filtering
- **Reduced data transfer** - Only matching results returned
- **Simpler code** - No need to manually filter arrays
- **Better pagination** - Works correctly with pagination_key

## Performance Notes

### API Filtering Advantages:
1. ✅ **Efficient** - Server-side filtering reduces data transfer
2. ✅ **Fast** - Retell API is optimized for these filters
3. ✅ **Scalable** - Works well even with large datasets
4. ✅ **Pagination-friendly** - Filters work correctly with pagination

### Best Practices:
1. **Always use API filters** when available (which is all our filters!)
2. **Use pagination_key** for datasets > 1000 calls (future enhancement)
3. **Use sort_order** to get most recent calls first
4. **Combine filters** - API handles multiple filters efficiently

## Status Mapping

Our CLI will accept simplified status values that map to API statuses:

| CLI Option | API Status | Description |
|------------|------------|-------------|
| `error` | `['error']` | Calls that ended with errors |
| `ended` | `['ended']` | Successfully completed calls |
| `ongoing` | `['ongoing']` | Calls currently in progress |

**Note:** API also supports 'registered' and 'not_connected' statuses, which we can add in future phases if needed.

## Example API Calls

### Example 1: Filter by status
```typescript
await client.call.list({
  filter_criteria: {
    call_status: ['error']
  },
  limit: 50,
  sort_order: 'descending'
});
```

### Example 2: Filter by agent and date range
```typescript
await client.call.list({
  filter_criteria: {
    agent_id: ['agent_123'],
    start_timestamp: {
      lower_threshold: new Date('2025-11-01').getTime(),
      upper_threshold: new Date('2025-11-15').getTime()
    }
  },
  limit: 100
});
```

### Example 3: Combined filters
```typescript
await client.call.list({
  filter_criteria: {
    call_status: ['error'],
    agent_id: ['agent_123'],
    start_timestamp: {
      lower_threshold: new Date('2025-11-01').getTime()
    }
  },
  limit: 20,
  sort_order: 'descending'
});
```

## Conclusion

The Retell API provides excellent filtering capabilities that meet all Phase 5 requirements without needing client-side filtering. This results in a cleaner, faster, and more efficient implementation.

**Implementation Recommendation:** Use 100% API filtering for Phase 5. Client-side filtering can be reserved for future edge cases or custom filters not supported by the API.
