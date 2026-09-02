/* ===== INVENTORY HUB — Multi-Warehouse, Stock Transfers & Stock Ledger ===== */
import React, { useEffect, useState } from "react";
import useInventoryStore from "../../store/inventoryStore";
import useAppStore from "../../store/appStore";
import { formatCurrency } from "../../utils/currency";
import { useToast } from "../../hooks/useToast";
import "../../styles/components.css";
import { ToastContainer } from "../../components/ui";

export default function InventoryHub() {
  const toast = useToast();
  const products = useAppStore((s) => s.products);

  const warehouses = useInventoryStore((s) => s.warehouses);
  const stockLedger = useInventoryStore((s) => s.stockLedger);
  const reorderAlerts = useInventoryStore((s) => s.reorderAlerts);
  const transfers = useInventoryStore((s) => s.transfers);
  const loadingWarehouses = useInventoryStore((s) => s.loadingWarehouses);

  const loadWarehouses = useInventoryStore((s) => s.loadWarehouses);
  const addWarehouse = useInventoryStore((s) => s.addWarehouse);
  const editWarehouse = useInventoryStore((s) => s.editWarehouse);
  const removeWarehouse = useInventoryStore((s) => s.removeWarehouse);
  const loadStockLedger = useInventoryStore((s) => s.loadStockLedger);
  const loadReorderAlerts = useInventoryStore((s) => s.loadReorderAlerts);
  const loadTransfers = useInventoryStore((s) => s.loadTransfers);
  const createTransfer = useInventoryStore((s) => s.createTransfer);
  const receiveTransfer = useInventoryStore((s) => s.receiveTransfer);

  const [activeTab, setActiveTab] = useState("warehouses"); // 'warehouses' | 'transfers' | 'ledger'
  const [warehouseModal, setWarehouseModal] = useState(false);
  const [editingWh, setEditingWh] = useState(null);
  const [whForm, setWhForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    isDefault: false,
  });

  const [transferModal, setTransferModal] = useState(false);
  const [trfForm, setTrfForm] = useState({
    fromWarehouseId: "",
    toWarehouseId: "",
    notes: "",
    items: [{ productId: "", quantitySent: 1 }],
  });

  const [ledgerFilter, setLedgerFilter] = useState({
    productId: "",
    warehouseId: "",
  });

  useEffect(() => {
    loadWarehouses();
    loadStockLedger();
    loadReorderAlerts();
    loadTransfers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Warehouse Handlers ── */
  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    if (!whForm.name || !whForm.code) {
      return toast.error("Name and Code are required");
    }
    try {
      if (editingWh) {
        await editWarehouse(editingWh.id, whForm);
        console.log("warehouse udpdates");
        toast.success("Warehouse updated ✓");
      } else {
        await addWarehouse(whForm);
        console.log("warehouse udpdates");
        toast.success("Warehouse created ✓");
      }
      setWarehouseModal(false);
      setEditingWh(null);
      setWhForm({
        name: "",
        code: "",
        address: "",
        phone: "",
        isDefault: false,
      });
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Operation failed");
    }
  };

  const handleDeleteWh = async (id) => {
    if (!window.confirm("Are you sure you want to delete this warehouse?"))
      return;
    try {
      await removeWarehouse(id);
      toast.success("Warehouse deleted ✓");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Delete failed");
    }
  };

  /* ── Transfer Handlers ── */
  const handleAddTransferItem = () => {
    setTrfForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantitySent: 1 }],
    }));
  };

  const handleRemoveTransferItem = (idx) => {
    setTrfForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateTransferItem = (idx, field, val) => {
    setTrfForm((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!trfForm.fromWarehouseId || !trfForm.toWarehouseId) {
      return toast.error("Select both source and destination warehouses");
    }
    if (trfForm.fromWarehouseId === trfForm.toWarehouseId) {
      return toast.error("Source and destination cannot be identical");
    }
    const validItems = trfForm.items.filter(
      (i) => i.productId && Number(i.quantitySent) > 0,
    );
    if (validItems.length === 0) {
      return toast.error("Add at least one valid product item");
    }

    try {
      await createTransfer({
        fromWarehouseId: Number(trfForm.fromWarehouseId),
        toWarehouseId: Number(trfForm.toWarehouseId),
        notes: trfForm.notes,
        items: validItems.map((i) => ({
          productId: Number(i.productId),
          quantitySent: Number(i.quantitySent),
        })),
      });
      toast.success("Stock transfer dispatched ✓");
      setTransferModal(false);
      setTrfForm({
        fromWarehouseId: "",
        toWarehouseId: "",
        notes: "",
        items: [{ productId: "", quantitySent: 1 }],
      });
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Transfer failed");
    }
  };

  const handleReceive = async (id) => {
    try {
      await receiveTransfer(id);
      toast.success("Stock transfer received into destination inventory ✓");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Receive failed");
    }
  };

  /* ── Filter Ledger ── */
  const handleFilterLedger = () => {
    loadStockLedger({
      productId: ledgerFilter.productId || undefined,
      warehouseId: ledgerFilter.warehouseId || undefined,
    });
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <ToastContainer toasts={toast.toasts} />
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              tracking: "-0.5px",
            }}
          >
            🏬 Inventory &amp; Warehouse Hub
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0 0" }}>
            Multi-warehouse stock control, inter-warehouse transfers, and full
            stock movement audit ledger
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {activeTab === "warehouses" && (
            <button
              onClick={() => {
                setEditingWh(null);
                setWhForm({
                  name: "",
                  code: "",
                  address: "",
                  phone: "",
                  isDefault: false,
                });
                setWarehouseModal(true);
              }}
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}
            >
              ＋ Add Warehouse
            </button>
          )}
          {activeTab === "transfers" && (
            <button
              onClick={() => setTransferModal(true)}
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
              }}
            >
              🔄 New Stock Transfer
            </button>
          )}
        </div>
      </div>

      {/* Reorder Alerts Warning Banner */}
      {reorderAlerts.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #fef2f2, #fff1f2)",
            border: "1px solid #fecdd3",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justify: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#9f1239" }}>
                Reorder Level Alert ({reorderAlerts.length} items low in stock)
              </div>
              <div style={{ fontSize: 12, color: "#be123c", marginTop: 2 }}>
                {reorderAlerts
                  .slice(0, 4)
                  .map((p) => `${p.name} (${p.stockQuantity} left)`)
                  .join(" · ")}
                {reorderAlerts.length > 4
                  ? ` and ${reorderAlerts.length - 4} more...`
                  : ""}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab("ledger");
            }}
            style={{
              background: "#9f1239",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Inspect Ledger
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "2px solid #e2e8f0",
          marginBottom: 24,
        }}
      >
        {[
          { key: "warehouses", label: `🏬 Warehouses (${warehouses.length})` },
          {
            key: "transfers",
            label: `🔄 Stock Transfers (${transfers.length})`,
          },
          { key: "ledger", label: `📜 Stock Movement Ledger` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: activeTab === tab.key ? "#2563eb" : "#64748b",
              borderBottom:
                activeTab === tab.key
                  ? "3px solid #2563eb"
                  : "3px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: WAREHOUSES ═══ */}
      {activeTab === "warehouses" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {loadingWarehouses ? (
            <div style={{ padding: 40, color: "#64748b" }}>
              Loading warehouses...
            </div>
          ) : (
            warehouses.map((wh) => (
              <div
                key={wh.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justify: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#2563eb",
                        background: "#eff6ff",
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {wh.code}
                    </span>
                    {wh.isDefault && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#16a34a",
                          background: "#dcfce7",
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        ★ DEFAULT
                      </span>
                    )}
                  </div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#0f172a",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {wh.name}
                  </h3>
                  <div
                    style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}
                  >
                    📍 {wh.address || "No address specified"}
                    <br />
                    📞 {wh.phone || "N/A"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <button
                    onClick={() => {
                      setEditingWh(wh);
                      setWhForm({
                        name: wh.name,
                        code: wh.code,
                        address: wh.address || "",
                        phone: wh.phone || "",
                        isDefault: wh.isDefault,
                      });
                      setWarehouseModal(true);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit
                  </button>
                  {!wh.isDefault && (
                    <button
                      onClick={() => handleDeleteWh(wh.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #fca5a5",
                        background: "#fef2f2",
                        color: "#dc2626",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ TAB 2: STOCK TRANSFERS ═══ */}
      {activeTab === "transfers" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <th style={{ padding: "14px 20px" }}>Transfer #</th>
                <th style={{ padding: "14px 20px" }}>From Warehouse</th>
                <th style={{ padding: "14px 20px" }}>To Warehouse</th>
                <th style={{ padding: "14px 20px" }}>Total Qty</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
                <th style={{ padding: "14px 20px" }}>Date</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    No stock transfers found
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {t.transferNumber}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#475569" }}>
                      {t.FromWarehouse?.name || `WH #${t.fromWarehouseId}`}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#475569" }}>
                      {t.ToWarehouse?.name || `WH #${t.toWarehouseId}`}
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 700 }}>
                      {t.totalQuantity} pcs
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          background:
                            t.status === "RECEIVED"
                              ? "#dcfce7"
                              : t.status === "DISPATCHED"
                                ? "#fef9c3"
                                : "#f1f5f9",
                          color:
                            t.status === "RECEIVED"
                              ? "#15803d"
                              : t.status === "DISPATCHED"
                                ? "#a16207"
                                : "#475569",
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        color: "#64748b",
                        fontSize: 13,
                      }}
                    >
                      {t.transferDate}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      {t.status === "DISPATCHED" && (
                        <button
                          onClick={() => handleReceive(t.id)}
                          style={{
                            background: "#16a34a",
                            color: "#fff",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          📥 Mark Received
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ TAB 3: STOCK LEDGER ═══ */}
      {activeTab === "ledger" && (
        <div>
          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 20,
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              alignItems: "center",
            }}
          >
            <select
              value={ledgerFilter.warehouseId}
              onChange={(e) =>
                setLedgerFilter({
                  ...ledgerFilter,
                  warehouseId: e.target.value,
                })
              }
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
              }}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <select
              value={ledgerFilter.productId}
              onChange={(e) =>
                setLedgerFilter({ ...ledgerFilter, productId: e.target.value })
              }
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
              }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleFilterLedger}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              🔍 Filter Audit Logs
            </button>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    color: "#475569",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <th style={{ padding: "12px 18px" }}>Date &amp; Time</th>
                  <th style={{ padding: "12px 18px" }}>Warehouse</th>
                  <th style={{ padding: "12px 18px" }}>Product</th>
                  <th style={{ padding: "12px 18px" }}>Type</th>
                  <th style={{ padding: "12px 18px" }}>Quantity</th>
                  <th style={{ padding: "12px 18px" }}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {stockLedger.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "#94a3b8",
                      }}
                    >
                      No stock ledger entries found
                    </td>
                  </tr>
                ) : (
                  stockLedger.map((m) => (
                    <tr
                      key={m.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "12px 18px", color: "#64748b" }}>
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 18px", fontWeight: 600 }}>
                        {m.Warehouse?.name || `WH #${m.warehouseId}`}
                      </td>
                      <td
                        style={{
                          padding: "12px 18px",
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {m.Product?.name || `Product #${m.productId}`}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            background:
                              m.movementType === "SALE" ||
                              m.movementType === "TRANSFER_OUT"
                                ? "#fef2f2"
                                : "#f0fdf4",
                            color:
                              m.movementType === "SALE" ||
                              m.movementType === "TRANSFER_OUT"
                                ? "#dc2626"
                                : "#16a34a",
                          }}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 18px",
                          fontWeight: 800,
                          color: Number(m.quantity) > 0 ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {Number(m.quantity) > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ padding: "12px 18px", color: "#64748b" }}>
                        {m.referenceType} #{m.referenceId || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ WAREHOUSE MODAL ═══ */}
      {warehouseModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 440,
              padding: 24,
              boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
              {editingWh ? "Edit Warehouse" : "New Warehouse"}
            </h2>
            <form
              onSubmit={handleSaveWarehouse}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Warehouse Name
                </label>
                <input
                  type="text"
                  value={whForm.name}
                  onChange={(e) =>
                    setWhForm({ ...whForm, name: e.target.value })
                  }
                  placeholder="e.g. Godown B"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Warehouse Code
                </label>
                <input
                  type="text"
                  value={whForm.code}
                  onChange={(e) =>
                    setWhForm({ ...whForm, code: e.target.value })
                  }
                  placeholder="e.g. WH-GODOWN-B"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Phone Number
                </label>
                <input
                  type="text"
                  value={whForm.phone}
                  onChange={(e) =>
                    setWhForm({ ...whForm, phone: e.target.value })
                  }
                  placeholder="e.g. +91 18907 89656"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  maxLength={10}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Address
                </label>
                <textarea
                  value={whForm.address}
                  onChange={(e) =>
                    setWhForm({ ...whForm, address: e.target.value })
                  }
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={whForm.isDefault}
                  onChange={(e) =>
                    setWhForm({ ...whForm, isDefault: e.target.checked })
                  }
                />
                <label
                  htmlFor="isDefault"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  Set as Default Warehouse
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setWarehouseModal(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: "none",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ STOCK TRANSFER MODAL ═══ */}
      {transferModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 560,
              padding: 24,
              boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
              🔄 Dispatch Inter-Warehouse Transfer
            </h2>
            <form
              onSubmit={handleCreateTransfer}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748b",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    From Warehouse
                  </label>
                  <select
                    value={trfForm.fromWarehouseId}
                    onChange={(e) =>
                      setTrfForm({
                        ...trfForm,
                        fromWarehouseId: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                    required
                  >
                    <option value="">Select Source</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748b",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    To Warehouse
                  </label>
                  <select
                    value={trfForm.toWarehouseId}
                    onChange={(e) =>
                      setTrfForm({ ...trfForm, toWarehouseId: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                    required
                  >
                    <option value="">Select Destination</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Products to Transfer
                </label>
                {trfForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        handleUpdateTransferItem(
                          idx,
                          "productId",
                          e.target.value,
                        )
                      }
                      style={{
                        flex: 3,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                      }}
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stockQuantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.quantitySent}
                      onChange={(e) =>
                        handleUpdateTransferItem(
                          idx,
                          "quantitySent",
                          e.target.value,
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                      }}
                      required
                    />
                    {trfForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTransferItem(idx)}
                        style={{
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddTransferItem}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    color: "#2563eb",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "6px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginTop: 4,
                  }}
                >
                  ＋ Add Item
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setTransferModal(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: "none",
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Dispatch Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
