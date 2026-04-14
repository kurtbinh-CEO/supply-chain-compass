import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, Upload, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";

/* ── Generic CRUD table data ── */
const itemsData = [
  { code: "GA-300", name: "Gạch 300×300", variant: "A4", uom: "m²", category: "Gạch lát", abc: "A", status: "Active" },
  { code: "GA-300", name: "Gạch 300×300", variant: "B2", uom: "m²", category: "Gạch lát", abc: "A", status: "Active" },
  { code: "GA-300", name: "Gạch 300×300", variant: "C1", uom: "m²", category: "Gạch lát", abc: "B", status: "Active" },
  { code: "GA-400", name: "Gạch 400×400", variant: "A4", uom: "m²", category: "Gạch lát", abc: "A", status: "Active" },
  { code: "GA-600", name: "Gạch 600×600", variant: "A4", uom: "m²", category: "Gạch lát", abc: "A", status: "Active" },
  { code: "GA-600", name: "Gạch 600×600", variant: "B2", uom: "m²", category: "Gạch lát", abc: "B", status: "Active" },
];

const suppliersData = [
  { code: "NM-001", name: "Mikado", lt: 14, moq: 1000, share: 60, reliability: "92% A", status: "Active" },
  { code: "NM-002", name: "Toko", lt: 21, moq: 500, share: 30, reliability: "78% C", status: "Active" },
  { code: "NM-003", name: "Phú Mỹ", lt: 7, moq: 500, share: 5, reliability: "45% D", status: "Active" },
  { code: "NM-004", name: "Đồng Tâm", lt: 10, moq: 1000, share: 3, reliability: "90% A", status: "Active" },
  { code: "NM-005", name: "Vigracera", lt: 12, moq: 500, share: 2, reliability: "88% B", status: "Active" },
];

const branchesData = [
  { code: "CN-BD", name: "Chi nhánh Bình Dương", region: "Nam", ss: "z=1.65 (95%)", status: "Active" },
  { code: "CN-ĐN", name: "Chi nhánh Đà Nẵng", region: "Trung", ss: "z=1.65 (95%)", status: "Active" },
  { code: "CN-HN", name: "Chi nhánh Hà Nội", region: "Bắc", ss: "z=1.65 (95%)", status: "Active" },
  { code: "CN-CT", name: "Chi nhánh Cần Thơ", region: "Nam", ss: "z=1.65 (95%)", status: "Active" },
];

const routesData = [
  { from: "Mikado", to: "CN-BD", mode: "Road", lt: 2, cost: "12K", vehicle: "Container 28T", capacity: "28.000 kg" },
  { from: "Mikado", to: "CN-ĐN", mode: "Road", lt: 3, cost: "18K", vehicle: "Truck 10T", capacity: "10.000 kg" },
  { from: "Toko", to: "CN-BD", mode: "Road", lt: 1, cost: "8K", vehicle: "Truck 10T", capacity: "10.000 kg" },
  { from: "CN-ĐN", to: "CN-BD", mode: "Road", lt: 1, cost: "40K", vehicle: "Truck 10T", capacity: "10.000 kg" },
];

const policiesData = [
  { policy: "SS service level", value: "95% (z=1.65)", applied: "All CN", desc: "Target stockout probability" },
  { policy: "Cutoff time", value: "18:00", applied: "CN adjust", desc: "Deadline CN nhập điều chỉnh" },
  { policy: "DRP run time", value: "23:00", applied: "Nightly", desc: "DRP engine trigger" },
  { policy: "Force-release levels", value: "3", applied: "PO release", desc: "SC Manager → Director → CEO" },
];

const calendarData = [
  { year: 2026, month: 5, workDays: 22, holidays: 0, tetOffset: "0", note: "Normal" },
  { year: 2026, month: 6, workDays: 22, holidays: 0, tetOffset: "0", note: "Normal" },
  { year: 2027, month: 1, workDays: 15, holidays: 7, tetOffset: "Tết 29/01-04/02", note: "Demand spike trước Tết" },
];

/* ── Tab definitions ── */
type TabKey = "items" | "suppliers" | "branches" | "routes" | "policies" | "calendar";

const tabDefs: { key: TabKey; label: string }[] = [
  { key: "items", label: "Items" },
  { key: "suppliers", label: "NM/Suppliers" },
  { key: "branches", label: "Chi nhánh" },
  { key: "routes", label: "Routes" },
  { key: "policies", label: "Policies" },
  { key: "calendar", label: "Calendar" },
];

/* ── Reusable table component ── */
function CrudTable({ headers, rows, onRowClick }: { headers: string[]; rows: string[][]; onRowClick?: (i: number) => void }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter(r => r.some(c => c.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full h-9 pl-9 pr-3 rounded-button border border-surface-3 bg-surface-0 text-table text-text-1 placeholder:text-text-3"
          />
        </div>
        <button
          onClick={() => toast("Thêm mới (demo)")}
          className="h-9 px-3 rounded-button bg-gradient-primary text-primary-foreground text-table-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm mới
        </button>
        <button
          onClick={() => toast("Upload CSV (demo)")}
          className="h-9 px-3 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-table-sm font-medium flex items-center gap-1.5 hover:bg-surface-1 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" /> Upload CSV
        </button>
      </div>
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {headers.map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={i}
                className={`${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 cursor-pointer transition-colors`}
                onClick={() => onRowClick?.(i)}
              >
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-2.5 ${j === 0 ? "font-medium text-text-1" : "text-text-2"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{filtered.length} kết quả</p>
    </div>
  );
}

/* ── Slide-in edit panel ── */
function EditPanel({ title, fields, onClose }: { title: string; fields: { label: string; value: string }[]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-surface-2 border-l border-surface-3 z-50 rounded-l-panel animate-slide-in-right shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
          <h2 className="font-display text-section-header text-text-1">{title}</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {fields.map(f => (
            <div key={f.label}>
              <label className="text-table-sm text-text-3 uppercase font-medium">{f.label}</label>
              <input
                defaultValue={f.value}
                className="w-full h-10 mt-1 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1"
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-surface-3 flex gap-2">
          <button
            onClick={() => { toast.success("Đã lưu"); onClose(); }}
            className="flex-1 h-10 rounded-button bg-gradient-primary text-primary-foreground font-medium text-table hover:opacity-90 transition-opacity"
          >
            Lưu
          </button>
          <button
            onClick={() => { toast("Đã xóa"); onClose(); }}
            className="h-10 px-4 rounded-button border border-danger text-danger text-table font-medium hover:bg-danger-bg transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </>
  );
}

export default function MasterDataPage() {
  const [editPanel, setEditPanel] = useState<{ title: string; fields: { label: string; value: string }[] } | null>(null);

  const openEdit = (title: string, headers: string[], row: string[]) => {
    setEditPanel({ title, fields: headers.map((h, i) => ({ label: h, value: row[i] || "" })) });
  };

  return (
    <AppLayout>
      <ScreenHeader title="Master Data" subtitle="Dữ liệu nền tảng" />
      <Tabs defaultValue="items">
        <TabsList className="bg-surface-1 border border-surface-3 mb-4">
          {tabDefs.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="data-[state=active]:bg-surface-2 data-[state=active]:text-text-1 text-text-2 text-table">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="items">
          <CrudTable
            headers={["Item code", "Tên", "Variant", "UOM", "Category", "ABC", "Status"]}
            rows={itemsData.map(d => [d.code, d.name, d.variant, d.uom, d.category, d.abc, d.status])}
            onRowClick={i => {
              const d = itemsData[i];
              openEdit(`${d.code} ${d.variant}`, ["Item code", "Tên", "Variant", "UOM", "Category", "ABC class", "Status"], [d.code, d.name, d.variant, d.uom, d.category, d.abc, d.status]);
            }}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <CrudTable
            headers={["NM code", "Tên", "LT (days)", "MOQ (m²)", "Share%", "Reliability", "Status"]}
            rows={suppliersData.map(d => [d.code, d.name, String(d.lt), d.moq.toLocaleString(), `${d.share}%`, d.reliability, d.status])}
            onRowClick={i => {
              const d = suppliersData[i];
              openEdit(d.name, ["NM code", "Tên", "LT mean (days)", "MOQ (m²)", "Share% UNIS", "Reliability", "Status"], [d.code, d.name, String(d.lt), String(d.moq), `${d.share}%`, d.reliability, d.status]);
            }}
          />
        </TabsContent>

        <TabsContent value="branches">
          <CrudTable
            headers={["CN code", "Tên", "Vùng", "SS policy", "Status"]}
            rows={branchesData.map(d => [d.code, d.name, d.region, d.ss, d.status])}
            onRowClick={i => {
              const d = branchesData[i];
              openEdit(d.name, ["CN code", "Tên", "Vùng", "SS policy", "Status"], [d.code, d.name, d.region, d.ss, d.status]);
            }}
          />
        </TabsContent>

        <TabsContent value="routes">
          <CrudTable
            headers={["From", "To", "Mode", "LT (days)", "Cost/m²", "Vehicle", "Capacity"]}
            rows={routesData.map(d => [d.from, d.to, d.mode, String(d.lt), d.cost, d.vehicle, d.capacity])}
            onRowClick={i => {
              const d = routesData[i];
              openEdit(`${d.from} → ${d.to}`, ["From", "To", "Mode", "LT (days)", "Cost/m²", "Vehicle", "Capacity"], [d.from, d.to, d.mode, String(d.lt), d.cost, d.vehicle, d.capacity]);
            }}
          />
        </TabsContent>

        <TabsContent value="policies">
          <CrudTable
            headers={["Policy", "Value", "Applied to", "Description"]}
            rows={policiesData.map(d => [d.policy, d.value, d.applied, d.desc])}
            onRowClick={i => {
              const d = policiesData[i];
              openEdit(d.policy, ["Policy", "Giá trị", "Applied to", "Description"], [d.policy, d.value, d.applied, d.desc]);
            }}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CrudTable
            headers={["Năm", "Tháng", "Ngày làm việc", "Ngày lễ", "Tết offset", "Note"]}
            rows={calendarData.map(d => [String(d.year), String(d.month), String(d.workDays), String(d.holidays), d.tetOffset, d.note])}
            onRowClick={i => {
              const d = calendarData[i];
              openEdit(`${d.year}/${d.month}`, ["Năm", "Tháng", "Ngày làm việc", "Ngày lễ", "Tết offset", "Note"], [String(d.year), String(d.month), String(d.workDays), String(d.holidays), d.tetOffset, d.note]);
            }}
          />
        </TabsContent>
      </Tabs>

      {editPanel && <EditPanel title={editPanel.title} fields={editPanel.fields} onClose={() => setEditPanel(null)} />}
      <ScreenFooter actionCount={5} />
    </AppLayout>
  );
}
