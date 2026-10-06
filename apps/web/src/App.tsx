import { useCallback, useState } from "react";
import { OpsShell } from "./components/layout/OpsShell.tsx";
import { CommandCenter } from "./components/operations/CommandCenter.tsx";
import { InvestigationView } from "./components/investigation/InvestigationView.tsx";
import { ActivityPage } from "./pages/ActivityPage.tsx";
import { BenchmarksPage } from "./pages/BenchmarksPage.tsx";
import { CasesPage } from "./pages/CasesPage.tsx";
import { SystemPage } from "./pages/SystemPage.tsx";
import type { DemoScenario } from "./fixtures/demo-scenarios.ts";
import { ApiError, submitCase } from "./lib/api.ts";
import type { Case } from "./lib/case-types.ts";
import type { NavId } from "./lib/system-truth.ts";
import { appendSessionCase, type SessionCaseEntry } from "./lib/session-store.ts";

type ViewMode = "nav" | "investigation";

export default function App() {
  const [nav, setNav] = useState<NavId>("operations");
  const [view, setView] = useState<ViewMode>("nav");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [scenarioTitle, setScenarioTitle] = useState<string | undefined>();
  const [activeDemoId, setActiveDemoId] = useState<string | undefined>();
  const [history, setHistory] = useState<SessionCaseEntry[]>([]);

  const openInvestigation = useCallback((c: Case, title?: string, demoId?: string) => {
    setCaseData(c);
    setScenarioTitle(title);
    setActiveDemoId(demoId);
    setView("investigation");
    setNav("cases");
  }, []);

  const run = useCallback(
    async (request: DemoScenario["request"], title?: string, demoId?: string) => {
      setLoading(true);
      setError(null);
      setScenarioTitle(title);
      setActiveDemoId(demoId);
      try {
        const result = await submitCase(request);
        setHistory((h) => appendSessionCase(h, result, { scenarioTitle: title, scenarioId: demoId }));
        openInvestigation(result, title, demoId);
      } catch (e) {
        setCaseData(null);
        setView("nav");
        if (e instanceof ApiError) {
          setError(`${e.message} (${e.status})`);
        } else {
          setError(e instanceof Error ? e.message : "Request failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [openInvestigation],
  );

  const onNavigate = (id: NavId) => {
    setNav(id);
    setView("nav");
  };

  const onOpenCase = (entry: SessionCaseEntry) => {
    openInvestigation(entry.caseData, entry.scenarioTitle, entry.scenarioId);
  };

  return (
    <OpsShell activeNav={nav} onNavigate={onNavigate}>
      {view === "investigation" && caseData ? (
        <InvestigationView
          caseData={caseData}
          scenarioTitle={scenarioTitle}
          onBack={() => {
            setView("nav");
            setNav("operations");
          }}
        />
      ) : (
        <>
          {nav === "operations" && (
            <CommandCenter
              history={history}
              loading={loading}
              activeDemoId={activeDemoId}
              error={error}
              onRunDemo={(s) => run(s.request, s.title, s.id)}
              onOpenCase={onOpenCase}
            />
          )}
          {nav === "cases" && (
            <CasesPage
              history={history}
              loading={loading}
              activeDemoId={activeDemoId}
              onRunDemo={(s) => run(s.request, s.title, s.id)}
              onOpenCase={onOpenCase}
            />
          )}
          {nav === "activity" && <ActivityPage history={history} onOpenCase={onOpenCase} />}
          {nav === "benchmarks" && <BenchmarksPage />}
          {nav === "system" && <SystemPage />}
        </>
      )}
    </OpsShell>
  );
}
