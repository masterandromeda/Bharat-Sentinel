'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { generateReport, Incident } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Report {
  generated_at: string;
  total_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  average_risk_score: number;
  approval_summary: { approved: number; rejected: number; pending: number };
  severity_breakdown: Record<string, number>;
  incidents: Incident[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  critical: '#f87171',
  high: '#fbbf24',
  medium: '#60a5fa',
  low: '#34d399',
};
const SEV_BG: Record<string, string> = {
  critical: 'rgba(248,113,113,0.1)',
  high: 'rgba(251,191,36,0.1)',
  medium: 'rgba(96,165,250,0.1)',
  low: 'rgba(52,211,153,0.1)',
};
const APPR_COLOR: Record<string, string> = {
  approved: '#34d399',
  rejected: '#f87171',
  pending: '#fbbf24',
};

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Severity Bar ─────────────────────────────────────────────────────────────
function SevBar({ sev, count, total, onClick, active }: {
  sev: string; count: number; total: number; onClick: () => void; active: boolean;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const color = SEV_COLOR[sev] || '#94a3b8';
  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      title={`Filter by ${sev}`}
    >
      <div className={`p-3 rounded-lg border transition-all ${active
        ? 'border-current bg-white/5'
        : 'border-transparent hover:border-white/10 hover:bg-white/2'}`}
        style={{ borderColor: active ? color + '60' : undefined }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color }}>{sev}</span>
          <span className="text-sm font-bold text-[#e2e8f0]">{count}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        {active && (
          <p className="text-[9px] text-[#64748b] mt-1.5">Click to clear filter</p>
        )}
      </div>
    </button>
  );
}

// ─── Incident Row ─────────────────────────────────────────────────────────────
function IncidentRow({ inc, onClick }: { inc: Incident; onClick: () => void }) {
  const sevColor = SEV_COLOR[inc.severity] || '#94a3b8';
  const apprColor = APPR_COLOR[inc.human_approval] || '#94a3b8';
  return (
    <tr
      onClick={onClick}
      className="border-b border-[#1e2d4a]/50 hover:bg-white/2 cursor-pointer transition-colors group"
      title={`View incident ${inc.id}`}
    >
      <td className="px-4 py-3 font-mono text-xs text-[#64748b] group-hover:text-blue-400 transition-colors">
        {inc.id.slice(0, 8)}
        <span className="text-[#1e2d4a]">…</span>
      </td>
      <td className="px-4 py-3 text-sm text-[#e2e8f0] max-w-[200px]">
        <span className="truncate block">{inc.threat_type}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
          style={{ color: sevColor, background: SEV_BG[inc.severity] || 'rgba(148,163,184,0.1)' }}>
          {inc.severity}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#e2e8f0]">
        <span style={{ color: inc.risk_score >= 75 ? '#f87171' : inc.risk_score >= 50 ? '#fbbf24' : '#60a5fa' }}
          className="font-bold">
          {Math.round(inc.risk_score)}
        </span>
        <span className="text-[#64748b]">/100</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-semibold capitalize" style={{ color: apprColor }}>
          {inc.human_approval}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#64748b]">{fmtDate(inc.created_at)}</td>
      <td className="px-4 py-3 text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">View →</td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sevFilter, setSevFilter] = useState<string | null>(null);
  const [apprFilter, setApprFilter] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    setSevFilter(null);
    setApprFilter(null);
    try {
      const r = await generateReport();
      setReport(r.data);
    } catch {
      setError('Failed to generate report. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Filtered incidents ─────────────────────────────────────────────────────
  const filteredIncidents = report
    ? report.incidents.filter(inc => {
        if (sevFilter && inc.severity !== sevFilter) return false;
        if (apprFilter && inc.human_approval !== apprFilter) return false;
        return true;
      })
    : [];

  // ── JSON Download ──────────────────────────────────────────────────────────
  const downloadJson = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bharat-sentinel-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  // ── PDF Download ───────────────────────────────────────────────────────────
  const downloadPdf = useCallback(async () => {
    if (!report) return;
    setPdfLoading(true);
    try {
      // Dynamic import so it only loads in browser
      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const PAGE_H = doc.internal.pageSize.getHeight();
      let y = 0;

      // Helper: add new page if needed
      const checkPage = (needed: number) => {
        if (y + needed > PAGE_H - 15) {
          doc.addPage();
          y = 20;
        }
      };

      // ── Cover / Header ─────────────────────────────────────────────────────
      // Dark header band
      doc.setFillColor(5, 10, 28);
      doc.rect(0, 0, W, 48, 'F');

      // Accent line
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 48, W, 1.5, 'F');

      // Shield icon placeholder (simple polygons)
      const sx = 14, sy = 10;
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(sx, sy, 22, 26, 3, 3, 'F');
      doc.setFillColor(6, 182, 212);
      doc.roundedRect(sx + 3, sy + 3, 16, 20, 2, 2, 'F');
      doc.setFillColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('BS', sx + 8, sy + 16);

      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(226, 232, 240);
      doc.text('BHARATSENTINEL', 42, 22);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('AI-Native Enterprise Cybersecurity Workforce', 42, 30);
      doc.setFontSize(9);
      doc.text('Security Audit & Incident Report', 42, 37);

      // Generation timestamp (right-aligned)
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const genStr = `Generated: ${fmtDateTime(report.generated_at)}`;
      doc.text(genStr, W - 14, 22, { align: 'right' });
      doc.text('AI Agents. Human Control. Continuous Security.', W - 14, 30, { align: 'right' });

      y = 58;

      // ── Executive Summary Title ────────────────────────────────────────────
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(226, 232, 240);
      doc.text('Executive Summary', 14, y);
      y += 3;
      doc.setFillColor(59, 130, 246);
      doc.rect(14, y, 40, 0.6, 'F');
      y += 8;

      // ── KPI Grid (2×2) ────────────────────────────────────────────────────
      const kpis = [
        { label: 'Total Incidents', value: String(report.total_incidents), color: [96, 165, 250] as [number, number, number] },
        { label: 'Critical Incidents', value: String(report.critical_incidents), color: [248, 113, 113] as [number, number, number] },
        { label: 'High Severity', value: String(report.high_incidents), color: [251, 191, 36] as [number, number, number] },
        { label: 'Avg Risk Score', value: `${report.average_risk_score} / 100`, color: [139, 92, 246] as [number, number, number] },
      ];

      const kpiW = (W - 28 - 9) / 2;
      kpis.forEach((kpi, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const kx = 14 + col * (kpiW + 3);
        const ky = y + row * 24;

        doc.setFillColor(12, 17, 40);
        doc.roundedRect(kx, ky, kpiW, 20, 2, 2, 'F');
        doc.setDrawColor(...kpi.color);
        doc.setLineWidth(0.3);
        doc.roundedRect(kx, ky, kpiW, 20, 2, 2, 'D');

        // Color accent left bar
        doc.setFillColor(...kpi.color);
        doc.rect(kx, ky + 2, 2, 16, 'F');

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...kpi.color);
        doc.text(kpi.value, kx + 8, ky + 12);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label.toUpperCase(), kx + 8, ky + 17);
      });

      y += 52;

      // ── Approval Summary ──────────────────────────────────────────────────
      checkPage(45);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(226, 232, 240);
      doc.text('Approval Summary', 14, y);
      y += 2;
      doc.setFillColor(139, 92, 246);
      doc.rect(14, y, 35, 0.5, 'F');
      y += 7;

      const apprItems = [
        { label: 'Approved', value: report.approval_summary.approved, color: [52, 211, 153] as [number, number, number] },
        { label: 'Rejected', value: report.approval_summary.rejected, color: [248, 113, 113] as [number, number, number] },
        { label: 'Pending Review', value: report.approval_summary.pending, color: [251, 191, 36] as [number, number, number] },
      ];
      const apprW = (W - 28 - 6) / 3;
      apprItems.forEach((a, idx) => {
        const ax = 14 + idx * (apprW + 3);
        doc.setFillColor(12, 17, 40);
        doc.roundedRect(ax, y, apprW, 18, 2, 2, 'F');
        doc.setDrawColor(...a.color);
        doc.setLineWidth(0.3);
        doc.roundedRect(ax, y, apprW, 18, 2, 2, 'D');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...a.color);
        doc.text(String(a.value), ax + apprW / 2, y + 10, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(a.label, ax + apprW / 2, y + 15, { align: 'center' });
      });
      y += 26;

      // ── Severity Breakdown ────────────────────────────────────────────────
      if (Object.keys(report.severity_breakdown).length > 0) {
        checkPage(45);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(226, 232, 240);
        doc.text('Severity Breakdown', 14, y);
        y += 2;
        doc.setFillColor(6, 182, 212);
        doc.rect(14, y, 37, 0.5, 'F');
        y += 7;

        const sevEntries = Object.entries(report.severity_breakdown);
        const barH = 8;
        const barAreaW = W - 80;
        const maxCount = Math.max(...sevEntries.map(([, c]) => c), 1);
        sevEntries.forEach(([sev, count]) => {
          checkPage(barH + 4);
          const pct = count / maxCount;
          const barW = pct * barAreaW;
          const colorMap: Record<string, [number, number, number]> = {
            critical: [248, 113, 113],
            high: [251, 191, 36],
            medium: [96, 165, 250],
            low: [52, 211, 153],
          };
          const c: [number, number, number] = colorMap[sev] || [148, 163, 184];

          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...c);
          doc.text(sev.toUpperCase(), 14, y + barH - 1.5);

          doc.setFillColor(20, 28, 55);
          doc.roundedRect(50, y, barAreaW, barH, 2, 2, 'F');
          doc.setFillColor(...c);
          doc.roundedRect(50, y, Math.max(barW, 3), barH, 2, 2, 'F');

          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(226, 232, 240);
          doc.text(String(count), 50 + barAreaW + 4, y + barH - 1.5);
          y += barH + 4;
        });
        y += 4;
      }

      // ── Incident Log Table ────────────────────────────────────────────────
      checkPage(30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(226, 232, 240);
      doc.text('Incident Log', 14, y);
      y += 2;
      doc.setFillColor(59, 130, 246);
      doc.rect(14, y, 25, 0.5, 'F');
      y += 5;

      if (report.incidents.length > 0) {
        const tableRows = report.incidents.map(inc => [
          inc.id.slice(0, 8),
          inc.threat_type.length > 35 ? inc.threat_type.slice(0, 33) + '…' : inc.threat_type,
          inc.severity.toUpperCase(),
          String(Math.round(inc.risk_score)),
          inc.human_approval,
          fmtDate(inc.created_at),
        ]);

        autoTable(doc, {
          startY: y,
          head: [['ID', 'Threat Type', 'Severity', 'Risk', 'Approval', 'Date']],
          body: tableRows,
          margin: { left: 14, right: 14 },
          styles: {
            fillColor: [8, 12, 28],
            textColor: [226, 232, 240],
            fontSize: 8,
            cellPadding: 3,
            lineColor: [30, 45, 74],
            lineWidth: 0.3,
          },
          headStyles: {
            fillColor: [12, 17, 40],
            textColor: [100, 116, 139],
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'left',
          },
          alternateRowStyles: { fillColor: [10, 14, 33] },
          columnStyles: {
            0: { cellWidth: 22, textColor: [100, 116, 139], font: 'courier' },
            2: { cellWidth: 20 },
            3: { cellWidth: 15 },
            4: { cellWidth: 22 },
            5: { cellWidth: 28 },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const sev = (data.cell.raw as string).toLowerCase();
              if (sev === 'critical') data.cell.styles.textColor = [248, 113, 113];
              else if (sev === 'high') data.cell.styles.textColor = [251, 191, 36];
              else if (sev === 'medium') data.cell.styles.textColor = [96, 165, 250];
              else if (sev === 'low') data.cell.styles.textColor = [52, 211, 153];
            }
            if (data.section === 'body' && data.column.index === 4) {
              const ap = (data.cell.raw as string).toLowerCase();
              if (ap === 'approved') data.cell.styles.textColor = [52, 211, 153];
              else if (ap === 'rejected') data.cell.styles.textColor = [248, 113, 113];
              else data.cell.styles.textColor = [251, 191, 36];
            }
            if (data.section === 'body' && data.column.index === 3) {
              const score = parseInt(data.cell.raw as string);
              if (score >= 75) data.cell.styles.textColor = [248, 113, 113];
              else if (score >= 50) data.cell.styles.textColor = [251, 191, 36];
              else data.cell.styles.textColor = [96, 165, 250];
            }
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Investigation Findings ────────────────────────────────────────────
      const withFindings = report.incidents.filter(inc => inc.investigation_summary || inc.recommendation);
      if (withFindings.length > 0) {
        checkPage(20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(226, 232, 240);
        doc.text('Key Investigation Findings', 14, y);
        y += 2;
        doc.setFillColor(139, 92, 246);
        doc.rect(14, y, 52, 0.5, 'F');
        y += 8;

        const displayFindings = withFindings.slice(0, 5);
        for (const inc of displayFindings) {
          checkPage(40);
          const sevColor: [number, number, number] = (
            SEV_COLOR[inc.severity]
              ? [parseInt(SEV_COLOR[inc.severity].slice(1, 3), 16),
                 parseInt(SEV_COLOR[inc.severity].slice(3, 5), 16),
                 parseInt(SEV_COLOR[inc.severity].slice(5, 7), 16)]
              : [148, 163, 184]
          ) as [number, number, number];

          // Incident header
          doc.setFillColor(12, 17, 40);
          doc.roundedRect(14, y, W - 28, 10, 2, 2, 'F');
          doc.setFillColor(...sevColor);
          doc.rect(14, y + 1.5, 2, 7, 'F');

          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(226, 232, 240);
          const titleTrunc = inc.threat_type.length > 60 ? inc.threat_type.slice(0, 58) + '…' : inc.threat_type;
          doc.text(titleTrunc, 20, y + 6.5);

          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`Risk: ${Math.round(inc.risk_score)}/100  |  ${inc.severity.toUpperCase()}  |  ${inc.human_approval}  |  ${fmtDate(inc.created_at)}`, W - 14, y + 6.5, { align: 'right' });
          y += 13;

          if (inc.investigation_summary) {
            checkPage(18);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(96, 165, 250);
            doc.text('SUMMARY', 18, y);
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(203, 213, 225);
            const sumLines = doc.splitTextToSize(inc.investigation_summary, W - 36);
            const showLines = sumLines.slice(0, 3);
            doc.text(showLines, 18, y);
            y += showLines.length * 4 + 2;
          }

          if (inc.recommendation) {
            checkPage(18);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(52, 211, 153);
            doc.text('RECOMMENDATION', 18, y);
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(203, 213, 225);
            const recLines = doc.splitTextToSize(inc.recommendation, W - 36);
            const showRec = recLines.slice(0, 2);
            doc.text(showRec, 18, y);
            y += showRec.length * 4 + 2;
          }
          y += 6;
        }

        if (withFindings.length > 5) {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text(`… and ${withFindings.length - 5} more incidents. See full JSON export for complete data.`, 14, y);
          y += 8;
        }
      }

      // ── Footer on every page ──────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFillColor(5, 10, 28);
        doc.rect(0, ph - 12, W, 12, 'F');
        doc.setFillColor(30, 45, 74);
        doc.rect(0, ph - 12, W, 0.5, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('BharatSentinel — AI Agents. Human Control. Continuous Security.', 14, ph - 4.5);
        doc.text(`Page ${p} of ${totalPages}`, W - 14, ph - 4.5, { align: 'right' });
        doc.text(`CONFIDENTIAL — ${fmtDate(report.generated_at)}`, W / 2, ph - 4.5, { align: 'center' });
      }

      doc.save(`bharat-sentinel-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generation failed. Try the JSON download instead.');
    } finally {
      setPdfLoading(false);
    }
  }, [report]);

  // ── Approval filter toggle ─────────────────────────────────────────────────
  const toggleApprFilter = (val: string) =>
    setApprFilter(prev => prev === val ? null : val);
  const toggleSevFilter = (val: string) =>
    setSevFilter(prev => prev === val ? null : val);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Reports & Audit</h1>
          <p className="text-[#64748b] text-sm mt-1">
            Generate security audit reports · Download PDF or JSON · Click any incident to investigate
          </p>
        </div>
        <div className="flex items-center gap-3">
          {report && (
            <>
              <button
                onClick={downloadJson}
                className="px-4 py-2 rounded-lg border border-[#2563eb]/40 text-blue-400 text-sm font-semibold hover:bg-blue-600/10 transition flex items-center gap-2"
              >
                <span>{ }</span>⬇ JSON
              </button>
              <button
                onClick={downloadPdf}
                disabled={pdfLoading}
                className="px-4 py-2 rounded-lg border border-purple-600/40 text-purple-300 text-sm font-semibold hover:bg-purple-600/10 transition flex items-center gap-2 disabled:opacity-60"
              >
                {pdfLoading ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>⬇ PDF</>
                )}
              </button>
            </>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 text-white font-semibold text-sm rounded-lg transition disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : '⟳ Generate Report'}
          </button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {!report && !loading && (
        <div className="glass-card p-16 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-[#64748b]">No report generated yet.</p>
          <p className="text-[#64748b] text-sm mt-2">
            Click <strong className="text-blue-400">Generate Report</strong> to pull live data from all incidents.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="glass-card h-28 rounded-xl bg-white/2" />
          <div className="glass-card h-20 rounded-xl bg-white/2" />
          <div className="glass-card h-64 rounded-xl bg-white/2" />
        </div>
      )}

      {/* ── Report Content ────────────────────────────────────────────────── */}
      {report && !loading && (
        <div className="space-y-6">

          {/* ── Meta bar ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/2 border border-[#1e2d4a]">
            <span className="text-xs text-[#64748b]">
              Report generated <strong className="text-[#94a3b8]">{fmtDateTime(report.generated_at)}</strong>
            </span>
            <div className="flex items-center gap-4 text-xs text-[#64748b]">
              {sevFilter && (
                <span className="flex items-center gap-1">
                  Filtered by severity:
                  <span className="font-bold" style={{ color: SEV_COLOR[sevFilter] }}>{sevFilter}</span>
                  <button onClick={() => setSevFilter(null)} className="ml-1 text-[#94a3b8] hover:text-white">✕</button>
                </span>
              )}
              {apprFilter && (
                <span className="flex items-center gap-1">
                  Filtered by approval:
                  <span className="font-bold" style={{ color: APPR_COLOR[apprFilter] }}>{apprFilter}</span>
                  <button onClick={() => setApprFilter(null)} className="ml-1 text-[#94a3b8] hover:text-white">✕</button>
                </span>
              )}
              <span>Showing <strong className="text-[#94a3b8]">{filteredIncidents.length}</strong> of {report.total_incidents} incidents</span>
            </div>
          </div>

          {/* ── Executive Summary KPIs ────────────────────────────────────── */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">Executive Summary</h2>
              <span className="text-[10px] text-[#64748b]">All-time totals</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Incidents', value: report.total_incidents, color: '#60a5fa', glow: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.25)', onClick: () => { setSevFilter(null); setApprFilter(null); } },
                { label: 'Critical', value: report.critical_incidents, color: '#f87171', glow: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.25)', onClick: () => toggleSevFilter('critical') },
                { label: 'High Severity', value: report.high_incidents, color: '#fbbf24', glow: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.25)', onClick: () => toggleSevFilter('high') },
                { label: 'Avg Risk Score', value: `${report.average_risk_score}`, color: '#a78bfa', glow: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.25)', sub: '/100', onClick: () => {} },
              ].map(k => (
                <button
                  key={k.label}
                  onClick={k.onClick}
                  className="text-center p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  style={{
                    background: k.glow,
                    borderColor: k.border,
                    boxShadow: `0 4px 20px ${k.glow}`,
                  }}
                  title={`Click to filter by ${k.label}`}
                >
                  <p className="text-2xl font-bold" style={{ color: k.color }}>
                    {k.value}{k.sub ? <span className="text-sm font-normal text-[#64748b]">{k.sub}</span> : null}
                  </p>
                  <p className="text-[10px] text-[#64748b] uppercase tracking-wider mt-1">{k.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Approval Summary + Severity Breakdown side by side ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Approval Summary */}
            <div className="glass-card p-6">
              <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-5">
                Approval Summary
                <span className="ml-2 text-[#3d5575] font-normal">(click to filter)</span>
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Approved', value: report.approval_summary.approved, key: 'approved', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
                  { label: 'Rejected', value: report.approval_summary.rejected, key: 'rejected', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
                  { label: 'Pending', value: report.approval_summary.pending, key: 'pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
                ].map(a => (
                  <button
                    key={a.key}
                    onClick={() => toggleApprFilter(a.key)}
                    className="text-center p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: apprFilter === a.key ? a.bg : 'rgba(255,255,255,0.02)',
                      borderColor: apprFilter === a.key ? a.border : 'rgba(30,45,74,0.8)',
                    }}
                    title={`Filter by ${a.label}`}
                  >
                    <p className="text-2xl font-bold" style={{ color: a.color }}>{a.value}</p>
                    <p className="text-[10px] text-[#64748b] mt-1">{a.label}</p>
                    {apprFilter === a.key && (
                      <p className="text-[9px] text-[#64748b] mt-1">active filter</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Breakdown */}
            {Object.keys(report.severity_breakdown).length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-5">
                  Severity Breakdown
                  <span className="ml-2 text-[#3d5575] font-normal">(click to filter)</span>
                </h2>
                <div className="space-y-1">
                  {(['critical', 'high', 'medium', 'low'] as const)
                    .filter(s => report.severity_breakdown[s] !== undefined)
                    .map(sev => (
                      <SevBar
                        key={sev}
                        sev={sev}
                        count={report.severity_breakdown[sev]}
                        total={report.total_incidents}
                        onClick={() => toggleSevFilter(sev)}
                        active={sevFilter === sev}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Incident Log ─────────────────────────────────────────────── */}
          {report.incidents.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1e2d4a] flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">Incident Log</h2>
                  <p className="text-[10px] text-[#3d5575] mt-0.5">Click any row to open full incident details</p>
                </div>
                <div className="flex items-center gap-2">
                  {(sevFilter || apprFilter) && (
                    <button
                      onClick={() => { setSevFilter(null); setApprFilter(null); }}
                      className="text-[10px] text-[#64748b] hover:text-white px-2 py-1 rounded border border-[#1e2d4a] hover:border-[#2d4a7a] transition"
                    >
                      ✕ Clear filters
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/incidents')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    View All Incidents →
                  </button>
                </div>
              </div>

              {filteredIncidents.length === 0 ? (
                <div className="px-6 py-12 text-center text-[#64748b] text-sm">
                  No incidents match the current filter.{' '}
                  <button onClick={() => { setSevFilter(null); setApprFilter(null); }} className="text-blue-400 hover:underline">Clear filter</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1e2d4a]">
                        {['ID', 'Threat Type', 'Severity', 'Risk', 'Approval', 'Date', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] uppercase text-[#64748b] tracking-wider font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidents.map(inc => (
                        <IncidentRow
                          key={inc.id}
                          inc={inc}
                          onClick={() => router.push(`/incidents/${inc.id}`)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table footer */}
              <div className="px-6 py-3 border-t border-[#1e2d4a] flex items-center justify-between bg-white/1">
                <span className="text-[10px] text-[#3d5575]">
                  {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''} displayed
                  {(sevFilter || apprFilter) && ` (filtered from ${report.total_incidents} total)`}
                </span>
                <div className="flex items-center gap-4">
                  <button onClick={downloadJson} className="text-[10px] text-[#64748b] hover:text-blue-400 transition">⬇ Export JSON</button>
                  <button onClick={downloadPdf} disabled={pdfLoading} className="text-[10px] text-[#64748b] hover:text-purple-400 transition disabled:opacity-60">⬇ Export PDF</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Recommendation summary ────────────────────────────────────── */}
          {report.incidents.some(i => i.recommendation) && (
            <div className="glass-card p-6">
              <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-4">Top Recommendations</h2>
              <div className="space-y-3">
                {report.incidents
                  .filter(i => i.recommendation && i.risk_score >= 50)
                  .sort((a, b) => b.risk_score - a.risk_score)
                  .slice(0, 4)
                  .map(inc => (
                    <button
                      key={inc.id}
                      onClick={() => router.push(`/incidents/${inc.id}`)}
                      className="w-full text-left p-4 rounded-lg bg-white/2 border border-[#1e2d4a] hover:border-blue-600/30 hover:bg-blue-600/5 transition group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5" style={{ color: SEV_COLOR[inc.severity] || '#94a3b8' }}>⬡</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-[#94a3b8] truncate">{inc.threat_type}</span>
                            <span className="text-xs text-[#64748b] shrink-0">Risk {Math.round(inc.risk_score)}/100</span>
                          </div>
                          <p className="text-sm text-[#e2e8f0] leading-relaxed">{inc.recommendation}</p>
                        </div>
                        <span className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition shrink-0">View →</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
