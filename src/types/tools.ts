/**
 * Tool Type Definitions for Retell CLI
 *
 * Type definitions for managing agent tools (custom functions, webhooks, etc.)
 * Tools are embedded within Retell LLM and Conversation Flow configurations.
 */

// ===== TOOL TYPE IDENTIFIERS =====

/**
 * All supported tool types in Retell LLM agents
 */
export type RetellLlmToolType =
  | "end_call"
  | "transfer_call"
  | "check_availability_cal"
  | "book_appointment_cal"
  | "press_digit"
  | "custom"
  | "extract_dynamic_variable"
  | "agent_swap"
  | "mcp"
  | "send_sms";

/**
 * All supported tool types in Conversation Flow agents
 */
export type ConversationFlowToolType =
  | "custom"
  | "check_availability_cal"
  | "book_appointment_cal";

// ===== BASE TOOL INTERFACES =====

/**
 * Base interface for all tools
 */
export interface BaseTool {
  name: string;
  type: string;
  description?: string;
}

/**
 * End call tool - terminates the call
 */
export interface EndCallTool extends BaseTool {
  type: "end_call";
}

/**
 * Transfer call tool - transfers to another number
 */
export interface TransferCallTool extends BaseTool {
  type: "transfer_call";
  transfer_destination: unknown;
  transfer_option: unknown;
}

/**
 * Check calendar availability tool
 */
export interface CheckAvailabilityCalTool extends BaseTool {
  type: "check_availability_cal";
  cal_api_key: string;
  event_type_id: number;
  timezone?: string;
}

/**
 * Book appointment tool
 */
export interface BookAppointmentCalTool extends BaseTool {
  type: "book_appointment_cal";
  cal_api_key: string;
  event_type_id: number;
  timezone?: string;
}

/**
 * Press DTMF digit tool
 */
export interface PressDigitTool extends BaseTool {
  type: "press_digit";
}

/**
 * Custom HTTP webhook tool - most common type
 */
export interface CustomTool extends BaseTool {
  type: "custom";
  url?: string;
  speak_during_execution?: boolean;
  speak_after_execution?: boolean;
  execution_message_description?: string;
  parameters?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  method?: string;
  timeout_ms?: number;
  response_variables?: Record<string, string>;
}

/**
 * Extract dynamic variable tool
 */
export interface ExtractDynamicVariableTool extends BaseTool {
  type: "extract_dynamic_variable";
  parameters?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Agent swap tool
 */
export interface AgentSwapTool extends BaseTool {
  type: "agent_swap";
  swap_to_agent_id: string;
  transfer_call_info_to_swapped_agent?: boolean;
  webhook_setting?:
    | "both_agents"
    | "only_destination_agent"
    | "only_source_agent";
}

/**
 * MCP tool
 */
export interface McpTool extends BaseTool {
  type: "mcp";
  mcp_id?: string;
  speak_during_execution?: boolean;
  speak_after_execution?: boolean;
  execution_message_description?: string;
  response_variables?: Record<string, string>;
}

/**
 * Send SMS tool
 */
export interface SendSMSTool extends BaseTool {
  type: "send_sms";
}

/**
 * Conversation Flow custom tool (slightly different structure)
 */
export interface ConversationFlowCustomTool extends BaseTool {
  type: "custom";
  tool_id?: string;
  url?: string;
  speak_during_execution?: boolean;
  speak_after_execution?: boolean;
  execution_message_description?: string;
  parameters?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  method?: string;
  timeout_ms?: number;
  response_variables?: Record<string, string>;
}

// ===== UNION TYPES =====

/**
 * Union of all Retell LLM tool types
 */
export type RetellLlmTool =
  | EndCallTool
  | TransferCallTool
  | CheckAvailabilityCalTool
  | BookAppointmentCalTool
  | PressDigitTool
  | CustomTool
  | ExtractDynamicVariableTool
  | AgentSwapTool
  | McpTool
  | SendSMSTool;

/**
 * Union of all Conversation Flow tool types
 */
export type ConversationFlowTool =
  | ConversationFlowCustomTool
  | CheckAvailabilityCalTool
  | BookAppointmentCalTool;

/**
 * Any tool type
 */
export type AnyTool = RetellLlmTool | ConversationFlowTool;

// ===== TOOL RESOLUTION TYPES =====

/**
 * Information about a single tool's location
 */
export interface ToolLocation {
  /** Where the tool is defined */
  location: "general" | "state" | "flow" | "component";
  /** State name (for Retell LLM state tools) */
  stateName?: string;
  /** Component ID (for Conversation Flow component tools) */
  componentId?: string;
}

/**
 * A tool with its location information
 */
export interface ToolWithLocation {
  tool: AnyTool;
  location: ToolLocation;
}

/**
 * Result of resolving tools for a Retell LLM agent
 */
export interface RetellLlmToolsResult {
  type: "retell-llm";
  agentId: string;
  agentName: string;
  llmId: string;
  generalTools: RetellLlmTool[];
  stateTools: Record<string, RetellLlmTool[]>;
  totalCount: number;
}

/**
 * Result of resolving tools for a Conversation Flow agent
 */
export interface ConversationFlowToolsResult {
  type: "conversation-flow";
  agentId: string;
  agentName: string;
  flowId: string;
  flowTools: ConversationFlowTool[];
  componentTools: Record<string, ConversationFlowTool[]>;
  totalCount: number;
}

/**
 * Error result when tools cannot be resolved
 */
export interface ToolsErrorResult {
  type: "custom-llm";
  error: string;
}

/**
 * Union type for all possible tool resolution results
 */
export type ToolsSource =
  | RetellLlmToolsResult
  | ConversationFlowToolsResult
  | ToolsErrorResult;

// ===== COMMAND OUTPUT TYPES =====

/**
 * Output format for tools list command (Retell LLM)
 */
export interface ToolsListOutputLlm {
  agent_id: string;
  agent_name: string;
  engine_type: "retell-llm";
  llm_id: string;
  general_tools: Array<{ name: string; type: string; description?: string }>;
  state_tools: Record<
    string,
    Array<{ name: string; type: string; description?: string }>
  >;
  total_count: number;
}

/**
 * Output format for tools list command (Conversation Flow)
 */
export interface ToolsListOutputFlow {
  agent_id: string;
  agent_name: string;
  engine_type: "conversation-flow";
  flow_id: string;
  flow_tools: Array<{ name: string; type: string; description?: string }>;
  component_tools: Record<
    string,
    Array<{ name: string; type: string; description?: string }>
  >;
  total_count: number;
}

/**
 * Output format for tools list command
 */
export type ToolsListOutput = ToolsListOutputLlm | ToolsListOutputFlow;

/**
 * Output format for tools get command
 */
export interface ToolGetOutput {
  agent_id: string;
  agent_name: string;
  tool_name: string;
  location: ToolLocation;
  tool: AnyTool;
}

/**
 * Output format for tools add/update/remove commands
 */
export interface ToolMutationOutput {
  message: string;
  agent_id: string;
  agent_name: string;
  tool_name: string;
  operation: "add" | "update" | "remove";
  location?: ToolLocation;
  note?: string;
}

/**
 * Output format for tools export command
 */
export interface ToolsExportOutput {
  agent_id: string;
  agent_name: string;
  engine_type: "retell-llm" | "conversation-flow";
  exported_at: string;
  tools: {
    general?: AnyTool[];
    states?: Record<string, AnyTool[]>;
    flow?: AnyTool[];
    components?: Record<string, AnyTool[]>;
  };
  total_count: number;
}

/**
 * Input format for tools import command
 */
export interface ToolsImportInput {
  agent_id?: string;
  tools: {
    general?: AnyTool[];
    states?: Record<string, AnyTool[]>;
    flow?: AnyTool[];
    components?: Record<string, AnyTool[]>;
  };
}

/**
 * Output format for tools import command
 */
export interface ToolsImportOutput {
  message: string;
  agent_id: string;
  agent_name: string;
  imported_count: number;
  tools_added: string[];
  note?: string;
}
