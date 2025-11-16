#!/usr/bin/env tsx
/**
 * SDK Exploration Script
 *
 * This script explores the retell-sdk to determine exact API method names,
 * TypeScript types, and pagination mechanisms.
 *
 * Usage: RETELL_API_KEY=your_key npx tsx scripts/explore-sdk.ts
 */

import Retell from 'retell-sdk';

async function exploreSdk() {
  const apiKey = process.env.RETELL_API_KEY;

  if (!apiKey) {
    console.error('Error: RETELL_API_KEY environment variable not set');
    console.error('Usage: RETELL_API_KEY=your_key npx tsx scripts/explore-sdk.ts');
    process.exit(1);
  }

  console.log('🔍 Exploring Retell SDK...\n');

  const client = new Retell({ apiKey });

  // ===== 1. EXPLORE CLIENT STRUCTURE =====
  console.log('='.repeat(60));
  console.log('1. CLIENT STRUCTURE');
  console.log('='.repeat(60));

  console.log('\nAvailable namespaces on client:');
  console.log(Object.keys(client).filter(key => typeof (client as any)[key] === 'object'));

  // ===== 2. AGENT METHODS =====
  console.log('\n' + '='.repeat(60));
  console.log('2. AGENT METHODS');
  console.log('='.repeat(60));

  if (client.agent) {
    console.log('\nMethods available on client.agent:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.agent)).filter(m => m !== 'constructor'));

    try {
      console.log('\nTesting client.agent.list():');
      const agents = await client.agent.list({ limit: 1 });
      console.log('✓ Success! Response type:', typeof agents);
      console.log('Response keys:', Object.keys(agents));
      if (Array.isArray(agents)) {
        console.log('Is array:', true);
        console.log('Sample agent keys:', agents[0] ? Object.keys(agents[0]) : 'No agents found');
      }
    } catch (error: any) {
      console.error('✗ Error:', error.message);
    }
  }

  // ===== 3. CALL METHODS =====
  console.log('\n' + '='.repeat(60));
  console.log('3. CALL METHODS');
  console.log('='.repeat(60));

  if (client.call) {
    console.log('\nMethods available on client.call:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.call)).filter(m => m !== 'constructor'));

    try {
      console.log('\nTesting client.call.list():');
      const calls = await client.call.list({ limit: 1 });
      console.log('✓ Success! Response type:', typeof calls);
      console.log('Response keys:', Object.keys(calls));
      if (Array.isArray(calls)) {
        console.log('Is array:', true);
        console.log('Sample call keys:', calls[0] ? Object.keys(calls[0]) : 'No calls found');
      }
    } catch (error: any) {
      console.error('✗ Error:', error.message);
    }
  }

  // ===== 4. LLM METHODS =====
  console.log('\n' + '='.repeat(60));
  console.log('4. LLM METHODS');
  console.log('='.repeat(60));

  const llmNamespaces = ['llm', 'retellLlm', 'retell_llm'];
  for (const ns of llmNamespaces) {
    if ((client as any)[ns]) {
      console.log(`\n✓ Found namespace: client.${ns}`);
      console.log(`Methods available on client.${ns}:`);
      console.log(Object.getOwnPropertyNames(Object.getPrototypeOf((client as any)[ns])).filter(m => m !== 'constructor'));
      break;
    }
  }

  if (!(client as any).llm && !(client as any).retellLlm && !(client as any).retell_llm) {
    console.log('\n✗ No LLM namespace found. Checking available namespaces:');
    console.log(Object.keys(client));
  }

  // ===== 5. CONVERSATION FLOW METHODS =====
  console.log('\n' + '='.repeat(60));
  console.log('5. CONVERSATION FLOW METHODS');
  console.log('='.repeat(60));

  const flowNamespaces = ['conversationFlow', 'conversation_flow', 'flow'];
  for (const ns of flowNamespaces) {
    if ((client as any)[ns]) {
      console.log(`\n✓ Found namespace: client.${ns}`);
      console.log(`Methods available on client.${ns}:`);
      console.log(Object.getOwnPropertyNames(Object.getPrototypeOf((client as any)[ns])).filter(m => m !== 'constructor'));
      break;
    }
  }

  if (!(client as any).conversationFlow && !(client as any).conversation_flow && !(client as any).flow) {
    console.log('\n✗ No conversation flow namespace found. Checking available namespaces:');
    console.log(Object.keys(client));
  }

  // ===== 6. TYPESCRIPT TYPES =====
  console.log('\n' + '='.repeat(60));
  console.log('6. TYPESCRIPT TYPES');
  console.log('='.repeat(60));

  console.log('\nAvailable type exports from Retell namespace:');
  console.log(Object.keys(Retell).filter(k => k[0] === k[0].toUpperCase()));

  // ===== 7. ERROR HANDLING =====
  console.log('\n' + '='.repeat(60));
  console.log('7. ERROR HANDLING');
  console.log('='.repeat(60));

  console.log('\nError classes available:');
  console.log('- Retell.APIError:', typeof Retell.APIError);
  console.log('- Retell.BadRequestError:', typeof (Retell as any).BadRequestError);
  console.log('- Retell.AuthenticationError:', typeof (Retell as any).AuthenticationError);
  console.log('- Retell.NotFoundError:', typeof (Retell as any).NotFoundError);

  // ===== 8. PAGINATION =====
  console.log('\n' + '='.repeat(60));
  console.log('8. PAGINATION MECHANISM');
  console.log('='.repeat(60));

  try {
    console.log('\nTesting pagination with client.call.list():');
    const calls = await client.call.list({ limit: 1 });
    console.log('Response structure:');
    console.log(JSON.stringify(calls, null, 2));
  } catch (error: any) {
    console.error('✗ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SDK EXPLORATION COMPLETE');
  console.log('='.repeat(60));
  console.log('\n💡 Next step: Document these findings in docs/sdk-investigation-results.md\n');
}

// Run exploration
exploreSdk().catch(error => {
  console.error('Fatal error during SDK exploration:', error);
  process.exit(1);
});
