/* ===== USER/REP REPORT — backend-driven (GET /reports/user-report) ===== */
import React from 'react';
import ReportView from './ReportView';

export default function UsersReport() {
  return <ReportView reportKey="userReport" />;
}
