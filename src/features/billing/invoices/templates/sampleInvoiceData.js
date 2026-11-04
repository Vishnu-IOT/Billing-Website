/* ===== Sample data for the Bill Templates settings preview ===== */
// Purely illustrative — never sent anywhere, never touches real bills.

export function getSampleInvoice() {
  return {
    invoiceNumber: 'INV/26-27/0001',
    date: new Date().toISOString(),
    billType: 'B2B',
    customerName: 'Sample Customer Pvt Ltd',
    billingAddress: '221B Baker Street, Anna Nagar',
    billingCity: 'Chennai',
    billingState: 'Tamil Nadu',
    billingZip: '600040',
    customerGST: '33ABCDE1234F1Z5',
    customerEmail: 'accounts@sample-customer.example',
    shippingAddress: '',
    discount: 5,
    amount: 11800,
    notes: 'Thank you for your business.',
    items: [
      {
        name: 'Premium Widget A',
        description: 'High-grade industrial widget',
        batchNumber: 'B-2026-01',
        hsn: '8471',
        quantity: 10,
        unit: 'pcs',
        rate: 500,
        discount: 0,
        taxRate: 18,
      },
      {
        name: 'Standard Widget B',
        description: '',
        hsn: '8471',
        quantity: 5,
        unit: 'pcs',
        rate: 800,
        discount: 0,
        taxRate: 18,
      },
      {
        name: 'Service Charge',
        description: 'Installation and setup',
        hsn: '9983',
        quantity: 1,
        unit: 'service',
        rate: 1500,
        discount: 0,
        taxRate: 18,
      },
    ],
  };
}

export function getSampleCompany(realCompany) {
  return {
    name: realCompany?.name || 'Your Company Name Pvt Ltd',
    gstNumber: realCompany?.gstNumber || '33XXXXX0000X1Z5',
    address: realCompany?.address || '1st Floor, Business Park',
    city: realCompany?.city || 'Salem',
    state: realCompany?.state || 'Tamil Nadu',
    zipCode: realCompany?.zipCode || '636001',
    phone: realCompany?.phone || '+91 98765 43210',
    logo: realCompany?.logo_url || realCompany?.logo || null,
    bankDetails: realCompany?.bankDetails || {
      accountName: 'Your Company Name Pvt Ltd',
      accountNumber: 'XXXXXXXXXX1234',
      bankName: 'Sample Bank',
      ifscCode: 'SMPL0001234',
    },
  };
}

// ── Sample data matching the CLASSIC template's prop shape (bill/party/items) ──
export function getSampleClassicBill() {
  return {
    invoiceNumber: 'INV/26-27/0001',
    saleDate: new Date().toISOString(),
    totalAmount: 11800,
    tax: 1800,
    paymentStatus: 'Unpaid',
    paymentMethod: 'Bank',
    bill_type: 'B2B',
  };
}

export function getSampleClassicParty() {
  return {
    name: 'Sample Customer Pvt Ltd',
    GST: '33ABCDE1234F1Z5',
    phone: '9876543210',
    email: 'accounts@sample-customer.example',
    address: '221B Baker Street, Anna Nagar, Chennai, Tamil Nadu 600040',
    state: 'Tamil Nadu',
  };
}

export function getSampleClassicItems() {
  return [
    {
      productName: 'Premium Widget A',
      batchNumber: 'B-2026-01',
      Product: { HSNCode: '8471' },
      quantity: 10,
      unit: 'pcs',
      price: 500,
      discountPercentage: 0,
      taxPercentage: 18,
      netRate: 5000,
    },
    {
      productName: 'Standard Widget B',
      Product: { HSNCode: '8471' },
      quantity: 5,
      unit: 'pcs',
      price: 800,
      discountPercentage: 0,
      taxPercentage: 18,
      netRate: 4000,
    },
    {
      productName: 'Service Charge',
      Product: { HSNCode: '9983' },
      quantity: 1,
      unit: 'service',
      price: 1500,
      discountPercentage: 0,
      taxPercentage: 18,
      netRate: 1500,
    },
  ];
}
