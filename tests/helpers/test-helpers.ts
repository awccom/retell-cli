/**
 * Shared test helpers and mocking utilities
 */

import { vi } from 'vitest';
import * as retellClient from '../../src/services/retell-client';
import * as outputFormatter from '../../src/services/output-formatter';

/**
 * Creates a mock Retell client with the specified methods
 *
 * @param methods Object mapping client namespaces to their methods
 * @returns Mock client object
 *
 * @example
 * // For agent commands
 * const mockClient = createMockRetellClient({
 *   agent: {
 *     list: vi.fn(),
 *     retrieve: vi.fn(),
 *   }
 * });
 *
 * @example
 * // For call/transcript commands
 * const mockClient = createMockRetellClient({
 *   call: {
 *     list: vi.fn(),
 *     retrieve: vi.fn(),
 *   }
 * });
 */
export function createMockRetellClient(methods: Record<string, any> = {}): any {
  return methods;
}

export interface TestSetup {
  /** Mock Retell client */
  mockClient: any;
  /** Spy for process.exit */
  exitSpy: any;
}

/**
 * Sets up common test mocks for command tests
 *
 * This function configures:
 * - Retell client mocks
 * - Output formatter mocks (outputJson, handleSdkError)
 * - process.exit spy
 *
 * @param mockClient The mock client to use (created with createMockRetellClient)
 * @returns TestSetup object containing mockClient and exitSpy
 *
 * @example
 * let mockClient: any;
 * let exitSpy: any;
 *
 * beforeEach(() => {
 *   vi.clearAllMocks();
 *
 *   mockClient = createMockRetellClient({
 *     agent: {
 *       list: vi.fn(),
 *     }
 *   });
 *
 *   const setup = setupCommandTest(mockClient);
 *   exitSpy = setup.exitSpy;
 * });
 *
 * afterEach(() => {
 *   exitSpy.mockRestore();
 * });
 */
export function setupCommandTest(mockClient: any): TestSetup {
  // Mock the Retell client
  vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);

  // Mock output formatter functions
  vi.mocked(outputFormatter.outputJson).mockImplementation(() => {});
  vi.mocked(outputFormatter.handleSdkError).mockImplementation((() => {
    process.exit(1);
  }) as any);

  // Mock process.exit
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  return {
    mockClient,
    exitSpy,
  };
}

/**
 * Restores mocks after a test
 *
 * @param exitSpy The exit spy to restore
 *
 * @example
 * afterEach(() => {
 *   cleanupCommandTest(exitSpy);
 * });
 */
export function cleanupCommandTest(exitSpy: any): void {
  exitSpy.mockRestore();
}
