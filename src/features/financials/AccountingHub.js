/* ===== FINANCIAL ACCOUNTING HUB — Double-Entry Bookkeeping & Ledgers ===== */
import React, { useEffect, useState } from 'react';
import useAccountingStore from '../../store/accountingStore';
import useAppStore from '../../store/appStore';
import { formatCurrency } from '../../utils/currency';
import { useToast } from '../../hooks/useToast';
import '../../styles/components.css';

export default function AccountingHub() {
  const toast = useToast();
  const parties = useAppStore((s) => s.parties);

  const accounts = useAccountingStore((s) => s.accounts);
  const journalEntries = useAccountingStore((s) => s.journalEntries);
  const partyLedger = useAccountingStore((s) => s.partyLedger);
  const trialBalance = useAccountingStore((s) => s.trialBalance);
  const profitAndLoss = useAccountingStore((s) => s.profitAndLoss);
  const balanceSheet = useAccountingStore((s) => s.balanceSheet);
  const loading = useAccountingStore((s) => s.loading);

  const loadChartOfAccounts = useAccountingStore((s) => s.loadChartOfAccounts);
  const addAccount = useAccountingStore((s) => s.addAccount);
  const loadJournalEntries = useAccountingStore((s) => s.loadJournalEntries);
  const addJournalEntry = useAccountingStore((s) => s.addJournalEntry);
  const loadPartyLedger = useAccountingStore((s) => s.loadPartyLedger);
  const loadTrialBalance = useAccountingStore((s) => s.loadTrialBalance);
  const loadProfitAndLoss = useAccountingStore((s) => s.loadProfitAndLoss);
  const loadBalanceSheet = useAccountingStore((s) => s.loadBalanceSheet);

  const [activeTab, setActiveTab] = useState('coa'); // 'coa' | 'partyLedger' | 'journals' | 'reports'
  const [reportSubTab, setReportSubTab] = useState('trialBalance'); // 'trialBalance' | 'pnl' | 'balanceSheet'

  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [accountModal, setAccountModal] = useState(false);
  const [accForm, setAccForm] = useState({ accountCode: '', name: '', accountType: 'ASSET' });

  const [journalModal, setJournalModal] = useState(false);
  const [jvForm, setJvForm] = useState({
    narration: '',
    lines: [
      { accountId: '', partyId: '', debitAmount: 0, creditAmount: 0, memo: '' },
      { accountId: '', partyId: '', debitAmount: 0, creditAmount: 0, memo: '' },
    ],
  });

  useEffect(() => {
    loadChartOfAccounts();
    loadJournalEntries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'reports') {
      if (reportSubTab === 'trialBalance') loadTrialBalance();
      if (reportSubTab === 'pnl') loadProfitAndLoss();
      if (reportSubTab === 'balanceSheet') loadBalanceSheet();
    }
  }, [activeTab, reportSubTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetchPartyLedger = () => {
    if (!selectedPartyId) return toast.error('Select a party first');
    loadPartyLedger(selectedPartyId);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await addAccount(accForm);
      toast.success('Account created ✓');
      setAccountModal(false);
      setAccForm({ accountCode: '', name: '', accountType: 'ASSET' });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create account');
    }
  };

  const handleAddJvLine = () => {
    setJvForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { accountId: '', partyId: '', debitAmount: 0, creditAmount: 0, memo: '' }],
    }));
  };

  const handleUpdateJvLine = (idx, field, val) => {
    setJvForm((prev) => {
      const updated = [...prev.lines];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, lines: updated };
    });
  };

  const handlePostJournalEntry = async (e) => {
    e.preventDefault();
    const validLines = jvForm.lines.filter((l) => l.accountId);
    const totalDebit = validLines.reduce((s, l) => s + Number(l.debitAmount || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + Number(l.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return toast.error(`Unbalanced Entry! Total Debit (${formatCurrency(totalDebit)}) must equal Total Credit (${formatCurrency(totalCredit)})`);
    }

    try {
      await addJournalEntry({
        narration: jvForm.narration,
        lines: validLines.map((l) => ({
          accountId: Number(l.accountId),
          partyId: l.partyId ? Number(l.partyId) : null,
          debitAmount: Number(l.debitAmount || 0),
          creditAmount: Number(l.creditAmount || 0),
          memo: l.memo,
        })),
      });
      toast.success('Journal Voucher posted ✓');
      setJournalModal(false);
      setJvForm({
        narration: '',
        lines: [
          { accountId: '', partyId: '', debitAmount: 0, creditAmount: 0, memo: '' },
          { accountId: '', partyId: '', debitAmount: 0, creditAmount: 0, memo: '' },
        ],
      });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Journal posting failed');
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            💼 Double-Entry Financial Accounting
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0 0' }}>
            Chart of Accounts, Party Ledgers, Automated &amp; Manual Journal Vouchers, Trial Balance, P&amp;L &amp; Balance Sheet
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {activeTab === 'coa' && (
            <button
              onClick={() => setAccountModal(true)}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              }}
            >
              ＋ Add Account
            </button>
          )}
          {activeTab === 'journals' && (
            <button
              onClick={() => setJournalModal(true)}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
              }}
            >
              📝 Post Journal Voucher
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { key: 'coa', label: `📊 Chart of Accounts (${accounts.length})` },
          { key: 'partyLedger', label: `👤 Party Running Ledger` },
          { key: 'journals', label: `📝 Journal Vouchers (${journalEntries.length})` },
          { key: 'reports', label: `📈 Financial Statements` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === tab.key ? '#2563eb' : '#64748b',
              borderBottom: activeTab === tab.key ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: CHART OF ACCOUNTS ═══ */}
      {activeTab === 'coa' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((type) => {
            const typeAccounts = accounts.filter((a) => a.accountType === type);
            return (
              <div key={type} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '2px solid #f1f5f9', paddingBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {type} ACCOUNTS
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, color: '#64748b' }}>
                    {typeAccounts.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {typeAccounts.map((acc) => (
                    <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', marginRight: 8 }}>{acc.accountCode}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{acc.name}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: Number(acc.currentBalance) >= 0 ? '#16a34a' : '#dc2626' }}>
                        {formatCurrency(acc.currentBalance || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ TAB 2: PARTY RUNNING LEDGER ═══ */}
      {activeTab === 'partyLedger' && (
        <div>
          {/* Party Selector Header */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', alignItems: 'center' }}>
            <select value={selectedPartyId} onChange={(e) => setSelectedPartyId(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 14, minWidth: 260 }}>
              <option value="">Select Customer / Supplier Party</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partyType || 'Party'})</option>)}
            </select>
            <button onClick={handleFetchPartyLedger} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              🔍 Generate Party Statement
            </button>
            {partyLedger && (
              <button onClick={() => window.print()} style={{ marginLeft: 'auto', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                🖨 Print Statement
              </button>
            )}
          </div>

          {partyLedger ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{partyLedger.party?.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Phone: {partyLedger.party?.phone || 'N/A'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Closing Balance</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: partyLedger.closingBalance >= 0 ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                    {formatCurrency(partyLedger.closingBalance)}
                  </div>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 18px' }}>Date</th>
                    <th style={{ padding: '12px 18px' }}>Voucher #</th>
                    <th style={{ padding: '12px 18px' }}>Particulars / Narration</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Debit (₹)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Credit (₹)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {partyLedger.data.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No ledger transactions recorded for this party</td></tr>
                  ) : (
                    partyLedger.data.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', color: '#64748b' }}>{l.date}</td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#2563eb' }}>{l.entryNumber}</td>
                        <td style={{ padding: '12px 18px', color: '#334155' }}>{l.narration}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: l.debit > 0 ? '#dc2626' : '#94a3b8' }}>{l.debit > 0 ? formatCurrency(l.debit) : '-'}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: l.credit > 0 ? '#16a34a' : '#94a3b8' }}>{l.credit > 0 ? formatCurrency(l.credit) : '-'}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 800 }}>{formatCurrency(l.runningBalance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
              <div style={{ fontWeight: 600 }}>Select a party above to load their running ledger statement</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: JOURNAL ENTRIES ═══ */}
      {activeTab === 'journals' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px' }}>Entry #</th>
                <th style={{ padding: '14px 20px' }}>Date</th>
                <th style={{ padding: '14px 20px' }}>Type</th>
                <th style={{ padding: '14px 20px' }}>Narration</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {journalEntries.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No journal vouchers found</td></tr>
              ) : (
                journalEntries.map((j) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#2563eb' }}>{j.entryNumber}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b' }}>{j.entryDate}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: '#f1f5f9', color: '#475569' }}>
                        {j.referenceType}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>{j.narration}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(j.totalDebit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ TAB 4: FINANCIAL STATEMENTS ═══ */}
      {activeTab === 'reports' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { key: 'trialBalance', label: '⚖️ Trial Balance' },
              { key: 'pnl', label: '📊 Profit & Loss (P&L)' },
              { key: 'balanceSheet', label: '🏛 Balance Sheet' },
            ].map((sub) => (
              <button
                key={sub.key}
                onClick={() => setReportSubTab(sub.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  background: reportSubTab === sub.key ? '#2563eb' : '#fff',
                  color: reportSubTab === sub.key ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  border: reportSubTab === sub.key ? 'none' : '1px solid #cbd5e1',
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Trial Balance */}
          {reportSubTab === 'trialBalance' && trialBalance && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 18px' }}>Code</th>
                    <th style={{ padding: '12px 18px' }}>Account Name</th>
                    <th style={{ padding: '12px 18px' }}>Type</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Debit (₹)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.data.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#2563eb' }}>{row.accountCode}</td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                      <td style={{ padding: '12px 18px', color: '#64748b' }}>{row.accountType}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700 }}>{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700 }}>{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', fontWeight: 800, fontSize: 14 }}>
                    <td colSpan={3} style={{ padding: '14px 18px' }}>TOTAL</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', color: '#16a34a' }}>{formatCurrency(trialBalance.totalDebit)}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', color: '#16a34a' }}>{formatCurrency(trialBalance.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Profit & Loss */}
          {reportSubTab === 'pnl' && profitAndLoss && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', marginTop: 0 }}>📈 Total Revenues</h3>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a', marginBottom: 16 }}>{formatCurrency(profitAndLoss.totalRevenue)}</div>
                {profitAndLoss.incomeAccounts.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span>{a.name}</span>
                    <strong>{formatCurrency(a.currentBalance || 0)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', marginTop: 0 }}>📉 Total Expenses</h3>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626', marginBottom: 16 }}>{formatCurrency(profitAndLoss.totalExpenses)}</div>
                {profitAndLoss.expenseAccounts.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span>{a.name}</span>
                    <strong>{formatCurrency(a.currentBalance || 0)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ gridColumn: '1 / -1', background: profitAndLoss.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${profitAndLoss.netProfit >= 0 ? '#86efac' : '#fca5a5'}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: profitAndLoss.netProfit >= 0 ? '#15803d' : '#991b1b', textTransform: 'uppercase' }}>NET PROFIT / LOSS</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: profitAndLoss.netProfit >= 0 ? '#15803d' : '#991b1b', marginTop: 4 }}>{formatCurrency(profitAndLoss.netProfit)}</div>
              </div>
            </div>
          )}

          {/* Balance Sheet */}
          {reportSubTab === 'balanceSheet' && balanceSheet && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', marginTop: 0 }}>🏛 Total Assets</h3>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#2563eb', marginBottom: 16 }}>{formatCurrency(balanceSheet.totalAssets)}</div>
                {balanceSheet.assetAccounts.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span>{a.name}</span>
                    <strong>{formatCurrency(a.currentBalance || 0)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#d97706', marginTop: 0 }}>💳 Liabilities &amp; Equity</h3>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#d97706', marginBottom: 16 }}>{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Liabilities</div>
                {balanceSheet.liabilityAccounts.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span>{a.name}</span>
                    <strong>{formatCurrency(a.currentBalance || 0)}</strong>
                  </div>
                ))}
                <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: '14px 0 6px 0' }}>Equity</div>
                {balanceSheet.equityAccounts.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span>{a.name}</span>
                    <strong>{formatCurrency(a.currentBalance || 0)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ADD ACCOUNT MODAL ═══ */}
      {accountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>New Account (Chart of Accounts)</h2>
            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Account Code</label>
                <input type="text" value={accForm.accountCode} onChange={(e) => setAccForm({ ...accForm, accountCode: e.target.value })} placeholder="e.g. 1020" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Account Name</label>
                <input type="text" value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} placeholder="e.g. HDFC Bank Account" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Account Type</label>
                <select value={accForm.accountType} onChange={(e) => setAccForm({ ...accForm, accountType: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}>
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setAccountModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ POST JOURNAL VOUCHER MODAL ═══ */}
      {journalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, padding: 24, boxShadow: '0 30px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>📝 Post Manual Journal Voucher</h2>
            <form onSubmit={handlePostJournalEntry} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Narration / Memo</label>
                <input type="text" value={jvForm.narration} onChange={(e) => setJvForm({ ...jvForm, narration: e.target.value })} placeholder="e.g. Opening cash balance adjustment" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Debit &amp; Credit Lines</label>
                {jvForm.lines.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={line.accountId} onChange={(e) => handleUpdateJvLine(idx, 'accountId', e.target.value)} style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} required>
                      <option value="">Select Account</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountCode} - {a.name} ({a.accountType})</option>)}
                    </select>
                    <input type="number" placeholder="Debit ₹" value={line.debitAmount || ''} onChange={(e) => handleUpdateJvLine(idx, 'debitAmount', e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
                    <input type="number" placeholder="Credit ₹" value={line.creditAmount || ''} onChange={(e) => handleUpdateJvLine(idx, 'creditAmount', e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                ))}
                <button type="button" onClick={handleAddJvLine} style={{ background: '#f1f5f9', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', marginTop: 4 }}>＋ Add Line</button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setJournalModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Post Journal Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
