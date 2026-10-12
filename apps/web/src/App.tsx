import { useCallback, useState } from "react";
import { OpsShell } from "./components/layout/OpsShell.tsx";
import { CommandCenter } from "./components/operations/CommandCenter.tsx";
import { InvestigationView } from "./components/investigation/InvestigationView.tsx";
import { ActivityPage } from "./pages/ActivityPage.tsx";
import { BenchmarksPage } from "./pages/BenchmarksPage.tsx";
import { CasesPage } from "./pages/CasesPage.tsx";
import { SystemPage } from "./pages/SystemPage.tsx";
import { DEMO_SCENARIOS, type DemoScenario } from "./fixtures/demo-scenarios.ts";
import type { ShowdownSide, ShowdownState } from "./components/proof/SafetyShowdown.tsx";
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
  const [showdown, setShowdown] = useState<ShowdownState>({ status: "idle" });

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

  // Two real requests, one after the other; each side records its own result or error.
  const runShowdown = useCallback(async (risky: DemoScenario) => {
    const safeScenario = DEMO_SCENARIOS.find((d) => d.id === "valid-duplicate")!;
    const runSide = async (scenario: DemoScenario): Promise<ShowdownSide> => {
      try {
        const result = await submitCase(scenario.request);
        setHistory((h) => appendSessionCase(h, result, { scenarioTitle: scenario.title, scenarioId: scenario.id }));
        return { scenario, result };
      } catch (e) {
        const msg = e instanceof ApiError ? `${e.message} (${e.status})` : e instanceof Error ? e.message : "Request failed";
        return { scenario, error: msg };
      }
    };
    setShowdown({ status: "running", safe: { scenario: safeScenario }, risky: { scenario: risky } });
    const safe = await runSide(safeScenario);
    setShowdown({ status: "running", safe, risky: { scenario: risky } });
    const riskySide = await runSide(risky);
    setShowdown({ status: "done", safe, risky: riskySide });
  }, []);

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
              showdown={showdown}
              onRunShowdown={runShowdown}
              onOpenShowdownSide={(side) => openInvestigation(side.result, side.scenario.title, side.scenario.id)}
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
