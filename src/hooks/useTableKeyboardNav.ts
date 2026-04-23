import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Rule 14 — Keyboard navigation for tables / row lists.
 *
 * Behaviour:
 *   ↑ / ↓     → move focus between rows
 *   Space     → toggle expansion (calls onToggleExpand)
 *   Enter     → primary action (calls onPrimaryAction)
 *   Home/End  → jump to first / last
 *
 * Focus ring is rendered via the global [data-keyboard-row]:focus rule
 * defined in src/index.css.
 *
 * Usage:
 *   const { containerRef, getRowProps, activeIndex } = useTableKeyboardNav({
 *     count: rows.length,
 *     onToggleExpand: (i) => toggleRow(rows[i].id),
 *     onPrimaryAction: (i) => openDetails(rows[i].id),
 *   });
 *
 *   <tbody ref={containerRef}>
 *     {rows.map((row, i) => (
 *       <tr key={row.id} {...getRowProps(i)} data-severity={row.severity}>
 *         ...
 *       </tr>
 *     ))}
 *   </tbody>
 */
export interface UseTableKeyboardNavOptions {
  count: number;
  onToggleExpand?: (index: number) => void;
  onPrimaryAction?: (index: number) => void;
  /** Initial focused row index (default 0). Set to -1 for none. */
  initialIndex?: number;
}

export function useTableKeyboardNav({
  count,
  onToggleExpand,
  onPrimaryAction,
  initialIndex = 0,
}: UseTableKeyboardNavOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.min(initialIndex, count - 1),
  );

  // Keep activeIndex in valid range when row count changes.
  useEffect(() => {
    setActiveIndex((prev) => {
      if (count === 0) return -1;
      if (prev < 0) return 0;
      if (prev >= count) return count - 1;
      return prev;
    });
  }, [count]);

  const focusRow = useCallback((index: number) => {
    const root = containerRef.current;
    if (!root) return;
    const row = root.querySelector<HTMLElement>(
      `[data-keyboard-row="${index}"]`,
    );
    row?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (count === 0) return;
      const target = e.target as HTMLElement;
      // Don't hijack typing inside form controls.
      if (
        target.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = Math.min(activeIndex + 1, count - 1);
          setActiveIndex(next);
          focusRow(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const next = Math.max(activeIndex - 1, 0);
          setActiveIndex(next);
          focusRow(next);
          break;
        }
        case "Home": {
          e.preventDefault();
          setActiveIndex(0);
          focusRow(0);
          break;
        }
        case "End": {
          e.preventDefault();
          const last = count - 1;
          setActiveIndex(last);
          focusRow(last);
          break;
        }
        case " ":
        case "Spacebar": {
          if (onToggleExpand && activeIndex >= 0) {
            e.preventDefault();
            onToggleExpand(activeIndex);
          }
          break;
        }
        case "Enter": {
          if (onPrimaryAction && activeIndex >= 0) {
            e.preventDefault();
            onPrimaryAction(activeIndex);
          }
          break;
        }
      }
    },
    [activeIndex, count, focusRow, onToggleExpand, onPrimaryAction],
  );

  const getRowProps = useCallback(
    (index: number) => ({
      "data-keyboard-row": index,
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: () => setActiveIndex(index),
      onKeyDown: handleKeyDown,
    }),
    [activeIndex, handleKeyDown],
  );

  return {
    containerRef: containerRef as React.MutableRefObject<HTMLElement | null>,
    activeIndex,
    setActiveIndex,
    getRowProps,
    focusRow,
  };
}
