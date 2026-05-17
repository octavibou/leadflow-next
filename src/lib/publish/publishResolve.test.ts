import { describe, it, expect } from "vitest";
import {
  applyLandingDeploymentToFunnel,
  extractLandingSnapshotFromFunnel,
  pickLandingSettingsPatch,
  isLandingSnapshotV1,
} from "@/lib/publish/publishResolve";
import type { Funnel, FunnelStep } from "@/types/funnel";

const baseFunnel = (): Funnel => ({
  id: "f1",
  user_id: "u1",
  name: "Test",
  slug: "test",
  type: "blank",
  settings: {
    primaryColor: "#111",
    fontFamily: "Inter",
    logoUrl: "",
    webhookUrl: "",
    bookingUrl: "",
    redirectUrlAfterBooking: "",
    vslVideoUrl: "",
    leadMagnetTitle: "",
    leadMagnetDescription: "",
    leadMagnetDownloadUrl: "",
    recruitingThankYouMessage: "",
    language: "es",
    customDomain: "",
    metaPixelId: "",
    metaAccessToken: "",
    metaTestEventCode: "",
    useLanding: true,
  },
  steps: [
    {
      id: "intro1",
      funnel_id: "f1",
      type: "intro",
      order: 0,
      intro: { headline: "H1", description: "", cta: "Go", showVideo: false },
    } as FunnelStep,
    {
      id: "q1",
      funnel_id: "f1",
      type: "question",
      order: 1,
      question: {
        id: "qq",
        step_id: "q1",
        text: "Q?",
        layout: "opts-col",
        options: [],
      },
    } as FunnelStep,
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  saved_at: new Date().toISOString(),
});

describe("publishResolve", () => {
  it("pickLandingSettingsPatch whitelists keys", () => {
    const p = pickLandingSettingsPatch({
      primaryColor: "#fff",
      metaPixelId: "should-drop",
      language: "en",
    });
    expect(p.primaryColor).toBe("#fff");
    expect(p.language).toBe("en");
    expect((p as { metaPixelId?: string }).metaPixelId).toBeUndefined();
  });

  it("extractLandingSnapshotFromFunnel captures intro", () => {
    const snap = extractLandingSnapshotFromFunnel(baseFunnel());
    expect(isLandingSnapshotV1(snap)).toBe(true);
    expect(snap.introStep?.type).toBe("intro");
  });

  it("applyLandingDeploymentToFunnel replaces intro and useLanding", () => {
    const f = baseFunnel();
    const newIntro = {
      ...f.steps[0],
      introConfig: { headline: "NEW", description: "", cta: "X", showVideo: false },
    } as FunnelStep;
    const merged = applyLandingDeploymentToFunnel(
      f,
      { snapshot_version: 1, introStep: newIntro, useLanding: false },
      { primaryColor: "#000" },
    );
    expect(merged.settings.useLanding).toBe(false);
    expect(merged.settings.primaryColor).toBe("#000");
    expect((merged.steps.find((s) => s.type === "intro") as FunnelStep).introConfig?.headline).toBe("NEW");
    expect(merged.steps.filter((s) => s.type === "question")).toHaveLength(1);
  });

  it("applyLandingDeploymentToFunnel removes intro when snapshot intro is null", () => {
    const f = baseFunnel();
    const merged = applyLandingDeploymentToFunnel(f, { snapshot_version: 1, introStep: null }, {});
    expect(merged.steps.some((s) => s.type === "intro")).toBe(false);
  });
});
