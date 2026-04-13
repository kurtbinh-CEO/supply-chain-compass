/* ── PO Number Generator ── */

const NM_CODES: Record<string, string> = {
  "Mikado": "MKD",
  "Toko": "TKO",
  "Phú Mỹ": "PMY",
  "Đồng Tâm": "DTM",
  "Vigracera": "VGR",
};

// Sequence counters per prefix
const seqCounters: Record<string, number> = {};

function nextSeq(prefix: string): string {
  seqCounters[prefix] = (seqCounters[prefix] || 0) + 1;
  return String(seqCounters[prefix]).padStart(3, "0");
}

function getYYMM(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export function getNmCode(nm: string): string {
  return NM_CODES[nm] || nm.slice(0, 3).toUpperCase();
}

export type POType = "BPO" | "RPO" | "TO" | "ASN";

export function generatePONumber(type: POType, params: {
  nm?: string;
  week?: number;
  from?: string;
  to?: string;
}): string {
  const yymm = getYYMM();

  switch (type) {
    case "BPO": {
      const code = getNmCode(params.nm || "");
      return `BPO-${code}-${yymm}`;
    }
    case "RPO": {
      const code = getNmCode(params.nm || "");
      const w = params.week ? `W${params.week}` : "W00";
      const prefix = `RPO-${code}-${yymm}-${w}`;
      return `${prefix}-${nextSeq(prefix)}`;
    }
    case "TO": {
      const from = (params.from || "").replace("CN-", "");
      const to = (params.to || "").replace("CN-", "");
      const prefix = `TO-${from}-${to}-${yymm}`;
      return `${prefix}-${nextSeq(prefix)}`;
    }
    case "ASN": {
      const code = getNmCode(params.nm || "");
      const prefix = `ASN-${code}-${yymm}`;
      return `${prefix}-${nextSeq(prefix)}`;
    }
  }
}

/** Style info for PO type badges */
export function getPoTypeBadge(type: POType): { bg: string; text: string } {
  switch (type) {
    case "BPO": return { bg: "bg-info-bg", text: "text-info" };
    case "RPO": return { bg: "bg-success-bg", text: "text-success" };
    case "TO":  return { bg: "bg-surface-1", text: "text-text-2" };
    case "ASN": return { bg: "bg-warning-bg", text: "text-warning" };
  }
}

/** PO number display component style classes */
export const poNumClasses = "font-mono text-[11px]";
