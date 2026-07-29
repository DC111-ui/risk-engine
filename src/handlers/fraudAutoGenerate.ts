import { EventBridgeClient, DisableRuleCommand } from '@aws-sdk/client-eventbridge';
import { TransactionStore } from '../services/transactionStore';
import { buildStoredItem } from '../services/scoreService';
import { scoreTransaction } from '../scoring/engine';
import { generateRealisticSAEvent } from '../scenarios/saTransactionGenerator';

const store = new TransactionStore();
const eventsClient = new EventBridgeClient({});

const RULE_NAME = process.env.STREAM_RULE_NAME!;
const STREAM_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TXN_PER_TICK = 3;

export const handler = async (): Promise<void> => {
  // Check stream state — if missing the rule was stopped externally, disable and exit
  const state = await store.getStreamState();
  if (!state) {
    await eventsClient.send(new DisableRuleCommand({ Name: RULE_NAME }));
    return;
  }

  const elapsed = Date.now() - new Date(state.streamStartedAt).getTime();
  if (elapsed > STREAM_TTL_MS) {
    console.log('[fraud-auto-generate] 10-minute TTL reached — disabling stream rule');
    await eventsClient.send(new DisableRuleCommand({ Name: RULE_NAME }));
    await store.clearStreamState();
    return;
  }

  // Stagger timestamps across the 60-second tick window so the feed looks natural
  const now = Date.now();
  const events = Array.from({ length: TXN_PER_TICK }, (_, i) => {
    const timestamp = new Date(now - i * 18_000).toISOString(); // 18s apart
    return generateRealisticSAEvent(timestamp);
  });

  const items = events.map(({ transaction, context }) => {
    const decision = scoreTransaction(transaction, context);
    return buildStoredItem(decision, transaction, {
      scenarioType: 'live-stream',
      isSynthetic: false,
    });
  });

  await store.saveBatch(items);
  console.log(`[fraud-auto-generate] wrote ${items.length} transactions (${Math.round(elapsed / 1000)}s elapsed)`);
};
