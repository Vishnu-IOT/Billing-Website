/* ===== SALE BILL FORM — Create B2B / B2C invoices ===== */
import React from 'react';
import DocumentForm from '../../components/shared/DocumentForm';
import POSScreen from './POSScreen';

export default function SaleBillForm({
  billingType = 'B2C',
  editMode = false,
  billId = null,
  onBack,
  onSaved,
}) {
  if (billingType === 'B2C') {
    return (
      <POSScreen
        editMode={editMode}
        billId={billId}
        onBack={onBack}
        onSaved={onSaved}
      />
    );
  }

  return (
    <DocumentForm
      docType="SALE_INVOICE"
      billingType={billingType}
      editMode={editMode}
      billId={billId}
      onBack={onBack}
      onSaved={onSaved}
    />
  );
}
