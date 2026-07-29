import { RiskDecision, Decision, Severity } from '../scoring/engine';
import { SignalSeverity } from '../scoring/signals';

const DECISION_COLORS: Record<Decision, string> = {
  APPROVE: '\x1b[32m',   // green
  REVIEW:  '\x1b[33m',   // yellow
  BLOCK:   '\x1b[31m',   // red
};

const SEVERITY_COLORS: Record<Severity | SignalSeverity, string> = {
  INFO:     '\x1b[37m',  // white
  LOW:      '\x1b[36m',  // cyan
  MEDIUM:   '\x1b[33m',  // yellow
  HIGH:     '\x1b[91m',  // bright red
  CRITICAL: '\x1b[35m',  // magenta
};

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

export function formatDecisionReport(decision: RiskDecision, scenarioName?: string): string {
  const lines: string[] = [];
  const bar = '─'.repeat(62);

  lines.push(`${DIM}${bar}${RESET}`);

  if (scenarioName) {
    lines.push(`${BOLD}  ${scenarioName}${RESET}`);
    lines.push(`${DIM}${bar}${RESET}`);
  }

  const dColor  = DECISION_COLORS[decision.decision];
  const sColor  = SEVERITY_COLORS[decision.severity];
  const score   = decision.riskScore.toString().padStart(3, ' ');

  lines.push(
    `  Transaction  ${DIM}${decision.transactionId}${RESET}`,
    `  User         ${DIM}${decision.userId}${RESET}`,
    `  Risk Score   ${BOLD}${score} / 100${RESET}`,
    `  Decision     ${dColor}${BOLD}${decision.decision}${RESET}`,
    `  Severity     ${sColor}${decision.severity}${RESET}`,
  );

  if (decision.triggeredSignals.length > 0) {
    lines.push(`\n  ${BOLD}Triggered Signals (${decision.triggeredSignals.length}):${RESET}`);
    for (const signal of decision.triggeredSignals) {
      const sev = SEVERITY_COLORS[signal.severity];
      lines.push(`    ${sev}▸ [${signal.code}]${RESET}  weight: ${signal.weight}`);
      lines.push(`      ${DIM}${signal.message}${RESET}`);
    }
  } else {
    lines.push(`\n  ${DIM}No risk signals triggered.${RESET}`);
  }

  lines.push(`${DIM}${bar}${RESET}\n`);
  return lines.join('\n');
}

export function formatAttackBurstReport(
  decisions: Array<{ label: string; result: RiskDecision }>,
  patternName: string,
): string {
  const lines: string[] = [];
  const bar = '═'.repeat(62);

  lines.push(`\n${BOLD}${bar}`);
  lines.push(`  ATTACK PATTERN: ${patternName}`);
  lines.push(`${bar}${RESET}\n`);

  for (const { label, result } of decisions) {
    const dColor = DECISION_COLORS[result.decision];
    const score  = result.riskScore.toString().padStart(3);
    const top    = result.metadata.topSignalCode ?? 'NONE';
    lines.push(
      `  ${DIM}${label.padEnd(42)}${RESET}  score: ${BOLD}${score}${RESET}  ` +
      `${dColor}${BOLD}${result.decision}${RESET}  ${DIM}[${top}]${RESET}`
    );
  }

  lines.push('');
  return lines.join('\n');
}
