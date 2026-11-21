/* ===== GSTR-1 REPORT — backend-driven (GET /reports/gstr1) ===== */
import GSTTemplateReport from './GSTTemplateReport';

export default function GSTR1Report() {
  return <GSTTemplateReport reportType="gstr1" />;
}
