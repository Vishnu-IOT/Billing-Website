/* ===== REPORT EXPORTS — Excel · PDF · Print =====
 * All three take the COMPLETE filtered dataset (rows from fetchAll), never just
 * the page on screen. Existing exportToExcel/exportToCSV in utils/export.js are
 * untouched; this adds the multi-sheet / PDF / print variants reports need.
 */
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { displayValue, excelValue, isNumericCol, summaryDisplay } from './reportFormat';

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const reportFileName = (label) => `${label.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}_${stamp()}`;

// summary cards → [{label, value}] using only values the backend returned
const summaryPairs = (cards, summary, opts) =>
  (cards || []).filter((c) => summary && summary[c.key] !== undefined && summary[c.key] !== null)
    .map((c) => ({ label: c.label, value: summaryDisplay(c, summary[c.key], opts), raw: summary[c.key], type: c.type }));

// ── Excel ───────────────────────────────────────────────────────────────────
export function exportReportExcel({ title, columns, rows, summary, summaryCards, filterLines = [], detail }) {
  if (!rows?.length) throw new Error('No data to export');
  const wb = XLSX.utils.book_new();

  const dataRows = rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, excelValue(c, r)])));
  const ws = XLSX.utils.json_to_sheet(dataRows);
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(c.label.length + 2, isNumericCol(c) ? 14 : 18) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  const pairs = summaryPairs(summaryCards, summary, {});
  const meta = [
    { Item: 'Report', Value: title },
    { Item: 'Generated', Value: new Date().toLocaleString('en-IN') },
    { Item: 'Rows exported', Value: rows.length },
    ...filterLines.map((f) => ({ Item: `Filter — ${f.label}`, Value: f.value })),
    ...pairs.map((p) => ({ Item: p.label, Value: p.type === 'currency' || p.type === 'number' ? Number(p.raw) : p.value })),
  ];
  const wsMeta = XLSX.utils.json_to_sheet(meta);
  wsMeta['!cols'] = [{ wch: 30 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Summary & Filters');

  if (detail?.rows?.length) {
    const d = XLSX.utils.json_to_sheet(
      detail.rows.map((r) => ({ [detail.parentLabel]: r.__parent, ...Object.fromEntries(detail.columns.map((c) => [c.label, excelValue(c, r)])) }))
    );
    XLSX.utils.book_append_sheet(wb, d, 'Products');
  }
  XLSX.writeFile(wb, `${reportFileName(title)}.xlsx`);
}

// ── PDF ─────────────────────────────────────────────────────────────────────
export function exportReportPDF({ title, subtitle, columns, rows, summary, summaryCards, filterLines = [] }) {
  if (!rows?.length) throw new Error('No data to export');
  const wide = columns.length > 11;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: wide ? 'a3' : 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(15).setFont(undefined, 'bold').text(title, 12, 14);
  doc.setFontSize(8.5).setFont(undefined, 'normal').setTextColor(90);
  let y = 19;
  if (subtitle) { doc.text(subtitle, 12, y); y += 4.5; }
  const filt = filterLines.length ? filterLines.map((f) => `${f.label}: ${f.value}`).join('   |   ') : 'No filters applied';
  doc.splitTextToSize(`Filters — ${filt}`, pageW - 24).forEach((ln) => { doc.text(ln, 12, y); y += 4; });
  const pairs = summaryPairs(summaryCards, summary, { plainMoney: true });
  if (pairs.length) {
    doc.splitTextToSize(pairs.map((p) => `${p.label}: ${p.value}`).join('   |   '), pageW - 24).forEach((ln) => { doc.setTextColor(30).text(ln, 12, y); y += 4; });
  }
  doc.setTextColor(120).text(`Generated ${new Date().toLocaleString('en-IN')}  ·  Amounts in INR  ·  ${rows.length} rows`, 12, y);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y + 3,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => displayValue(c, r, { plainMoney: true }))),
    styles: { fontSize: wide ? 6.5 : 7.5, cellPadding: 1.6, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, { halign: isNumericCol(c) ? 'right' : 'left' }])),
    margin: { left: 12, right: 12, bottom: 12 },
    didDrawPage: () => {
      const n = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5).setTextColor(130)
        .text(`Page ${n}`, pageW - 12, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
    },
  });
  doc.save(`${reportFileName(title)}.pdf`);
}

// ── Print ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function printReport({ title, subtitle, columns, rows, summary, summaryCards, filterLines = [] }) {
  if (!rows?.length) throw new Error('No data to print');
  const pairs = summaryPairs(summaryCards, summary, {});
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font: 11px/1.4 Inter, Arial, sans-serif; color: #0f172a; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 2px; } .sub { color: #475569; margin-bottom: 6px; }
  .meta { color: #475569; margin-bottom: 8px; font-size: 10.5px; }
  .cards { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 10px; }
  .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 9px; min-width: 110px; }
  .card b { display: block; font-size: 12px; } .card span { color: #64748b; font-size: 9.5px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2563eb; color: #fff; text-align: left; font-size: 10px; padding: 4px 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td { padding: 3px 5px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
  tr:nth-child(even) td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  th.n, td.n { text-align: right; font-variant-numeric: tabular-nums; }
  thead { display: table-header-group; } tr { page-break-inside: avoid; }
</style></head><body>
<h1>${esc(title)}</h1>
${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
<div class="meta">${filterLines.length ? esc(filterLines.map((f) => `${f.label}: ${f.value}`).join('  |  ')) : 'No filters applied'}<br>Generated ${esc(new Date().toLocaleString('en-IN'))} · ${rows.length} rows</div>
${pairs.length ? `<div class="cards">${pairs.map((p) => `<div class="card"><span>${esc(p.label)}</span><b>${esc(p.value)}</b></div>`).join('')}</div>` : ''}
<table><thead><tr>${columns.map((c) => `<th class="${isNumericCol(c) ? 'n' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td class="${isNumericCol(c) ? 'n' : ''}">${esc(displayValue(c, r))}</td>`).join('')}</tr>`).join('')}</tbody></table>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const idoc = iframe.contentWindow.document;
  idoc.open(); idoc.write(html); idoc.close();
  const cleanup = () => setTimeout(() => iframe.parentNode && iframe.parentNode.removeChild(iframe), 500);
  iframe.contentWindow.onafterprint = cleanup;
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(cleanup, 60000); }, 250);
}
