"use client";

/**
 * NOTE:
 * This file previously depended on `@base-ui/react`, but that package currently
 * conflicts with this repo's `date-fns` / `react-day-picker` peer deps.
 *
 * At the moment there are no imports of `@/components/ui/combobox` in the codebase,
 * but Next/TS still type-checks it during `next build`.
 *
 * To keep the build green, we provide a minimal, dependency-free stub API here.
 * If/when a combobox is needed, we can replace this with a Radix-based implementation.
 */

import * as React from "react";

type DivProps = React.ComponentPropsWithoutRef<"div">;
type ButtonProps = React.ComponentPropsWithoutRef<"button">;
type InputProps = React.ComponentPropsWithoutRef<"input">;

const Combobox = React.forwardRef<HTMLDivElement, DivProps>(function Combobox(
  props,
  ref
) {
  return <div ref={ref} data-slot="combobox" {...props} />;
});

const ComboboxValue = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxValue(props, ref) {
    return <div ref={ref} data-slot="combobox-value" {...props} />;
  }
);

const ComboboxTrigger = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function ComboboxTrigger(props, ref) {
    return <button ref={ref} type="button" data-slot="combobox-trigger" {...props} />;
  }
);

const ComboboxClear = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function ComboboxClear(props, ref) {
    return <button ref={ref} type="button" data-slot="combobox-clear" {...props} />;
  }
);

const ComboboxInput = React.forwardRef<HTMLInputElement, InputProps>(
  function ComboboxInput(props, ref) {
    return <input ref={ref} data-slot="combobox-input" {...props} />;
  }
);

const ComboboxContent = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxContent(props, ref) {
    return <div ref={ref} data-slot="combobox-content" {...props} />;
  }
);

const ComboboxList = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxList(props, ref) {
    return <div ref={ref} data-slot="combobox-list" {...props} />;
  }
);

const ComboboxItem = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxItem(props, ref) {
    return <div ref={ref} data-slot="combobox-item" {...props} />;
  }
);

const ComboboxGroup = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxGroup(props, ref) {
    return <div ref={ref} data-slot="combobox-group" {...props} />;
  }
);

const ComboboxLabel = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxLabel(props, ref) {
    return <div ref={ref} data-slot="combobox-label" {...props} />;
  }
);

const ComboboxCollection = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxCollection(props, ref) {
    return <div ref={ref} data-slot="combobox-collection" {...props} />;
  }
);

const ComboboxEmpty = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxEmpty(props, ref) {
    return <div ref={ref} data-slot="combobox-empty" {...props} />;
  }
);

const ComboboxSeparator = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxSeparator(props, ref) {
    return <div ref={ref} data-slot="combobox-separator" {...props} />;
  }
);

const ComboboxChips = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxChips(props, ref) {
    return <div ref={ref} data-slot="combobox-chips" {...props} />;
  }
);

const ComboboxChip = React.forwardRef<HTMLDivElement, DivProps>(
  function ComboboxChip(props, ref) {
    return <div ref={ref} data-slot="combobox-chip" {...props} />;
  }
);

const ComboboxChipsInput = React.forwardRef<HTMLInputElement, InputProps>(
  function ComboboxChipsInput(props, ref) {
    return <input ref={ref} data-slot="combobox-chip-input" {...props} />;
  }
);

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  ComboboxClear,
  useComboboxAnchor,
};
