/* ===== STOCK REPORT — backend-driven (GET /reports/stock-report) ===== */
import React from 'react';
import ReportView from './ReportView';

export default function StockReport() {
  return <ReportView reportKey="stockReport" />;
}
