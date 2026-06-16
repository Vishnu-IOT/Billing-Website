import React, { useState } from 'react';
import useInvoiceColumnStore from '../../store/invoiceColumnStore';
import { Button } from '../ui';

export function ColumnSettingsDrawer({ open, onClose }) {
  const { columns, toggleColumn, reorderColumn, resetToDefault } =
    useInvoiceColumnStore();

  // Local state for dragging
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  if (!open) return null;

  function handleDragStart(e, index) {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image hack (optional, makes it look cleaner)
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx === null || draggedIdx === index) return;
    setDragOverIdx(index);
  }

  function handleDrop(e, index) {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== index) {
      reorderColumn(draggedIdx, index);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 400,
          backgroundColor: 'var(--bg)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease',
        }}
      >
        <div
          style={{
            padding: 'var(--sp-4)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, margin: 0 }}
            >
              Column Settings
            </h2>
            <p
              style={{
                fontSize: 'var(--fs-xs)',
                color: 'var(--text-muted)',
                margin: '4px 0 0 0',
              }}
            >
              Drag to reorder. Check to show/hide.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-4)' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-2)',
            }}
          >
            {columns.map((col, idx) => {
              const isDragging = draggedIdx === idx;
              const isOver = dragOverIdx === idx;

              return (
                <div
                  key={col.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-3)',
                    padding: 'var(--sp-3)',
                    backgroundColor: 'var(--bg-card)',
                    border: `1px solid ${isOver ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isDragging ? 'var(--shadow-md)' : 'none',
                  }}
                >
                  <span
                    style={{
                      cursor: 'grab',
                      color: 'var(--text-muted)',
                      padding: '0 4px',
                    }}
                  >
                    ⋮⋮
                  </span>
                  <input
                    type="checkbox"
                    checked={col.visible}
                    disabled={col.disabled}
                    onChange={() => toggleColumn(col.id)}
                    style={{
                      width: 16,
                      height: 16,
                      cursor: col.disabled ? 'not-allowed' : 'pointer',
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      color: col.disabled
                        ? 'var(--text-muted)'
                        : 'var(--text-primary)',
                      flex: 1,
                    }}
                  >
                    {col.label}
                  </span>
                  {col.disabled && (
                    <span
                      style={{
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text-muted)',
                        background: 'var(--bg)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Required
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            padding: 'var(--sp-4)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 'var(--sp-3)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <Button
            variant="secondary"
            onClick={resetToDefault}
            style={{ flex: 1 }}
          >
            Reset to Default
          </Button>
          <Button variant="primary" onClick={onClose} style={{ flex: 1 }}>
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
