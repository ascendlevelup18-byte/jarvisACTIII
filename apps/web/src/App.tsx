import { useCallback, useEffect, useState } from "react";
import { OpsShell } from "./components/layout/OpsShell.tsx";
import { CommandCenter } from "./components/operations/CommandCenter.tsx";
import { InvestigationView } from "./components/investigation/InvestigationView.tsx";
import { ActivityPage } from "./pages/ActivityPage.tsx";
import { BenchmarksPage } from "./pages/BenchmarksPage.tsx";
import { CasesPage } from "./pages/CasesPage.tsx";
import { SystemPage } from "./pages/SystemPage.tsx";
import { ApprovalsPage } from "./pages/ApprovalsPage.tsx";
import { AutomationsPage } from "./pages/AutomationsPage.tsx";
import { OnboardingPage } from "./pages/OnboardingPage.tsx";
import { StorefrontPage } from "./pages/StorefrontPage.tsx";
import { OrdersPage, type StoreLoad } from "./pages/OrdersPage.tsx";
import { InboxPage } from "./pages/InboxPage.tsx";
import { btn } from "./components/ui/styles.ts";
import { buildInboxThreads } from "./lib/commerce.ts";
import type { AutomationModule } from "./lib/automations.ts";
import { fetchDemoStore, refundRequestFor, type DemoStoreOrder, type DemoStoreSnapshot } from "./lib/demo-store.ts";
import { DEMO_SCENARIOS, type DemoScenario } from "./fixtures/demo-scenarios.ts";
import type { ShowdownSide, ShowdownState } from "./components/proof/SafetyShowdown.tsx";
import { ApiError, submitCase } from "./lib/api.ts";
import type { Case, CaseRequest } from "./lib/case-types.ts";
import type { NavId } from "./lib/system-truth.ts";
import { appendSessionCase, type SessionCaseEntry } from "./lib/session-store.ts";

type ViewMode = "nav" | "investigation";
type Surface = "onboarding" | "merchant" | "store";

// Setup choices are a per-browser convenience; the app works without storage.
const SETUP_KEY = "jarvis.setup.v1";
function loadSetup(): AutomationModule["id"][] | null {
  try {
    const raw = window.localStorage.getItem(SETUP_KEY);
    const parsed = raw ? (JSON.parse(raw) as { modules?: unknown }) : null;
    return Array.isArray(parsed?.modules) ? (parsed.modules as AutomationModule["id"][]) : null;
  } catch {
    return null;
  }
}
function saveSetup(modules: AutomationModule["id"][]): void {
  try {
    window.localStorage.setItem(SETUP_KEY, JSON.stringify({ modules }));
  } catch {
    /* storage unavailable: setup simply isn't remembered */
  }
}
function initialSurface(): Surface {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  if (hash === "#store") return "store";
  if (hash === "#setup") return "onboarding";
  return loadSetup() ? "merchant" : "onboarding";
}

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
  const [surface, setSurface] = useState<Surface>(initialSurface);
  const [modules, setModules] = useState<AutomationModule["id"][]>(() => loadSetup() ?? ["refunds"]);
  const [storeSnapshot, setStoreSnapshot] = useState<DemoStoreSnapshot | null>(null);
  const [storeLoad, setStoreLoad] = useState<StoreLoad>({ status: "idle" });

  const loadStore = useCallback(async () => {
    setStoreLoad({ status: "loading" });
    try {
      setStoreSnapshot(await fetchDemoStore());
      setStoreLoad({ status: "idle" });
    } catch (e) {
      setStoreLoad({ status: "error", error: e instanceof Error ? e.message : "Request failed" });
    }
  }, []);


  useEffect(() => {
    const hash = surface === "store" ? "#store" : surface === "onboarding" ? "#setup" : "";
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash || window.location.pathname);
  }, [surface]);

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

  // Demo-store customer request → real case on the backend → visible to the merchant.
  const submitFromStore = useCallback(async (request: CaseRequest, order: { orderId: string; supportRequest: { scenario: string } }) => {
    try {
      const result = await submitCase(request);
      setHistory((h) =>
        appendSessionCase(h, result, {
          scenarioTitle: `Demo store · order #${order.orderId}`,
          scenarioId: order.supportRequest.scenario,
          source: "storefront",
        }),
      );
      return result;
    } catch (e) {
      throw e instanceof ApiError ? new Error(`${e.message} (${e.status})`) : e;
    }
  }, []);

  // Orders / Inbox: send an order's fixed customer request from the console (a real POST /cases).
  const runOrder = useCallback(async (o: DemoStoreOrder) => {
    try {
      const result = await submitCase(refundRequestFor(o));
      setHistory((h) => appendSessionCase(h, result, { scenarioTitle: `Order #${o.orderId}`, scenarioId: o.supportRequest.scenario }));
    } catch (e) {
      throw e instanceof ApiError ? new Error(`${e.message} (${e.status})`) : e;
    }
  }, []);

  const needsHuman = buildInboxThreads(history, storeSnapshot).filter((t) => t.status === "Needs human" || t.status === "Failed").length;

  if (surface === "onboarding") {
    return (
      <OnboardingPage
        onComplete={(r) => {
          saveSetup(r.modules);
          setModules(r.modules);
          setStoreSnapshot(r.store);
          setNav("automations");
          setView("nav");
          setSurface("merchant");
        }}
      />
    );
  }

  if (surface === "store") {
    return (
      <StorefrontPage
        snapshot={storeSnapshot}
        onSubmit={submitFromStore}
        onOpenCase={(c, order) => {
          openInvestigation(c, `Demo store · order #${order.orderId}`, order.supportRequest.scenario);
          setSurface("merchant");
        }}
        onExit={() => setSurface("merchant")}
      />
    );
  }

  const onNavigate = (id: NavId) => {
    // Orders and Inbox read the demo store; load it the first time either is opened.
    if ((id === "orders" || id === "inbox") && !storeSnapshot && storeLoad.status !== "loading") void loadStore();
    setNav(id);
    setView("nav");
  };

  const onOpenCase = (entry: SessionCaseEntry) => {
    openInvestigation(entry.caseData, entry.scenarioTitle, entry.scenarioId);
  };

  return (
    <OpsShell
      activeNav={nav}
      onNavigate={onNavigate}
      badges={{ inbox: needsHuman }}
      actions={
        <>
          <button type="button" onClick={() => setSurface("store")} className={btn.secondary}>
            Open demo store
          </button>
          <button type="button" onClick={() => setSurface("onboarding")} className={btn.ghost}>
            Setup
          </button>
        </>
      }
    >
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
          {nav === "benchmarks" && <BenchmarksPage history={history} onOpenCase={onOpenCase} onOpenStore={() => setSurface("store")} />}
          {nav === "orders" && (
            <OrdersPage snapshot={storeSnapshot} load={storeLoad} onReload={loadStore} history={history} onOpenCase={onOpenCase} onRunOrder={runOrder} />
          )}
          {nav === "inbox" && (
            <InboxPage history={history} snapshot={storeSnapshot} onOpenCase={onOpenCase} onOpenStore={() => setSurface("store")} onRerun={runOrder} />
          )}
          {nav === "automations" && <AutomationsPage enabled={modules} history={history} onOpenStore={() => setSurface("store")} />}
          {nav === "approvals" && <ApprovalsPage history={history} onOpenCase={onOpenCase} />}
          {nav === "system" && <SystemPage />}
        </>
      )}
    </OpsShell>
  );
}
