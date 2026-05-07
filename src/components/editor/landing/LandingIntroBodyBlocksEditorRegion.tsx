"use client";

import type { IntroConfig } from "@/types/funnel";
import { LandingIntroBodyBlocks } from "@/components/funnel/LandingIntroBodyBlocks";
import { LandingBodyBlockFloatingTools } from "@/components/editor/landing/LandingBodyBlockFloatingTools";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import {
  getLandingBasicBlockId,
  getLandingBlockBuildKind,
  isLandingBuildPrimitiveKind,
} from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_BASIC_BLOCK_DRAG_TYPE, type LandingBasicBlockDragPayload } from "@/lib/landingBodyDrag";

function typesHasLandingDrag(types: Iterable<string>): boolean {
  return [...types].includes(LANDING_BASIC_BLOCK_DRAG_TYPE);
}

function parseLandingDrop(ev: React.DragEvent): string | null {
  try {
    const raw = ev.dataTransfer.getData(LANDING_BASIC_BLOCK_DRAG_TYPE);
    if (!raw) return null;
    const p = JSON.parse(raw) as LandingBasicBlockDragPayload;
    return typeof p.builderBlockId === "string" ? p.builderBlockId : null;
  } catch {
    return null;
  }
}

/** Lista debajo del hero + drop de bloques básicos en modo constructor. */
export function LandingIntroBodyBlocksEditorRegion({
  introConfig,
  primary,
  isMobile,
}: {
  introConfig: IntroConfig | undefined;
  primary: string;
  isMobile: boolean;
}) {
  const {
    consumeDroppedPrimitive,
    selectedBodyRowId,
    openLandingBodyRow,
    bodyCanvasActionsConfigured,
    removeLandingBodyRow,
    duplicateLandingBodyRow,
    insertLandingBodyBelow,
    copyLandingBodyRowJson,
    moveLandingBodyRowBefore,
  } = useLandingBuilder();
  const blocks = introConfig?.landingBodyBlocks;
  const canDnD = bodyCanvasActionsConfigured;

  return (
    <div
      className="mx-auto mt-4 w-full"
      onDragOver={(e) => {
        if (!canDnD || !typesHasLandingDrag(e.dataTransfer.types)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        if (!canDnD) return;
        const bid = parseLandingDrop(e);
        if (!bid) return;
        const primitive = getLandingBlockBuildKind(bid as LandingBuilderComponentId);
        if (!primitive) return;
        consumeDroppedPrimitive(primitive);
      }}
    >
      <LandingIntroBodyBlocks
        blocks={blocks}
        primary={primary}
        isMobile={isMobile}
        editorChrome={Boolean(canDnD)}
        selectedRowId={selectedBodyRowId}
        onRowActivate={(b) => {
          if (!isLandingBuildPrimitiveKind(b.kind)) return;
          openLandingBodyRow(b.id, getLandingBasicBlockId(b.kind));
        }}
        onReorderRow={canDnD ? moveLandingBodyRowBefore : undefined}
        editorToolbarSlot={
          canDnD
            ? ({ block, selected }) =>
                selected ? (
                  <LandingBodyBlockFloatingTools
                    onAddBelow={() => insertLandingBodyBelow(block.id)}
                    onDuplicate={() => duplicateLandingBodyRow(block.id)}
                    onCopyClipboard={() => copyLandingBodyRowJson(block.id)}
                    onRemove={() => removeLandingBodyRow(block.id)}
                  />
                ) : null
            : undefined
        }
      />
    </div>
  );
}
