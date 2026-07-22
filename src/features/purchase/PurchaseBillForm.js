/* ===== PURCHASE BILL FORM ===== */
import React from 'react';
import DocumentForm from '../../components/shared/DocumentForm';

export default function PurchaseBillForm({
  editMode = false,
  billId = null,
  onBack,
  onSaved,
}) {
  return (
    <DocumentForm
      docType="PURCHASE_BILL"
      editMode={editMode}
      billId={billId}
      onBack={onBack}
      onSaved={onSaved}
    />
  );
}
