/* ===== GSTR-1 REPORT — backend-driven (GET /reports/gstr1) ===== */
import React from 'react';
import ReportView from './ReportView';

export default function GSTR1Report() {
  return <ReportView reportKey="gstr1" />;
}
