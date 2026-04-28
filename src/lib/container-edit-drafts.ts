/* ═══════════════════════════════════════════════════════════════════════════
   §  container-edit-drafts — lưu nháp phiên chỉnh chuyến (DRP container)
   §  Persist vào localStorage, key theo container ID. Dùng cho DropPointsEditor.
   §  - Lưu thứ tự CN code + savedAt timestamp.
   §  - Auto-save mỗi khi `order` thay đổi (debounce 400ms ngoài hook).
   §  - Manual save / restore / clear API.
   ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "drp:container-edit-drafts:v1";

export interface ContainerEditDraft {
  containerId: string;
  cnOrder: string[];      // ["CN-BD", "CN-DN"]
  savedAt: number;        // epoch ms
  auto: boolean;          // true = auto-save, false = manual
}

type DraftMap = Record<string, ContainerEditDraft>;

function readAll(): DraftMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: DraftMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode — bỏ qua */
  }
}

export function getDraft(containerId: string): ContainerEditDraft | null {
  return readAll()[containerId] ?? null;
}

export function saveDraft(
  containerId: string,
  cnOrder: string[],
  opts: { auto?: boolean } = {},
): ContainerEditDraft {
  const map = readAll();
  const draft: ContainerEditDraft = {
    containerId,
    cnOrder,
    savedAt: Date.now(),
    auto: opts.auto ?? false,
  };
  map[containerId] = draft;
  writeAll(map);
  return draft;
}

export function clearDraft(containerId: string) {
  const map = readAll();
  if (map[containerId]) {
    delete map[containerId];
    writeAll(map);
  }
}

/** Format "vừa xong / 5 phút trước / 19/05 14:32" cho UI badge. */
export function formatDraftAge(savedAt: number): string {
  const diff = Date.now() - savedAt;
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "vừa xong";
  if (sec < 60) return `${sec}s trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const d = new Date(savedAt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}
