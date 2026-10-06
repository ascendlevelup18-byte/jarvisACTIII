import type { Case } from "../../lib/case-types.ts";
import { OperationalFlow } from "../flow/OperationalFlow.tsx";
import { AuditTimelinePanel } from "../panels/AuditTimelinePanel.tsx";
import { AuthorizationPanel } from "../panels/AuthorizationPanel.tsx";
import { CaseContextPanel } from "../panels/CaseContextPanel.tsx";
import { EscalationPanel } from "../panels/EscalationPanel.tsx";
import { EvidencePanel } from "../panels/EvidencePanel.tsx";
import { ExecutionPanel, VerificationPanel } from "../panels/ExecutionVerificationPanel.tsx";
import { IntentCuesPanel } from "../panels/IntentCuesPanel.tsx";
import { ProposalPanel } from "../panels/ProposalPanel.tsx";
import { UnderstandingPanel } from "../panels/UnderstandingPanel.tsx";
import { MoneyMovementStrip } from "./MoneyMovementStrip.tsx";
import { VerdictBanner } from "./VerdictBanner.tsx";

/** @deprecated Prefer InvestigationView — kept as thin alias for compatibility. */
export function CaseWorkspace({ caseData, scenarioTitle }: { caseData: Case; scenarioTitle?: string }) {
  return (
    <div className="mt-5 space-y-4">
      <VerdictBanner caseData={caseData} />
      <MoneyMovementStrip caseData={caseData} />
      <OperationalFlow caseData={caseData} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <CaseContextPanel caseData={caseData} scenarioTitle={scenarioTitle} />
          <UnderstandingPanel understanding={caseData.understanding} />
          <IntentCuesPanel evidence={caseData.evidence} />
          <EvidencePanel evidence={caseData.evidence} />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <ProposalPanel proposal={caseData.proposal} />
          <AuthorizationPanel authorization={caseData.authorization} />
          <EscalationPanel caseData={caseData} />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <ExecutionPanel action={caseData.action} authorization={caseData.authorization} />
          <VerificationPanel verification={caseData.verification} />
          <AuditTimelinePanel audit={caseData.audit} />
        </div>
      </div>
    </div>
  );
}
