/* ===== CAMERA SCANNER — Mobile barcode scanning via html5-qrcode ===== */
import React, { useEffect, useRef, useState } from 'react';

const SCANNER_ID = 'pos-camera-scanner-reader';

/**
 * CameraScanner Modal
 * Uses raw Html5Qrcode for continuous camera scanning with programmatic controls,
 * custom playBeep sound, duplicate debounce throttle, and a visual log of scanned session items.
 */
export default function CameraScanner({ open, onClose, onScan }) {
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedSessionItems, setScannedSessionItems] = useState([]);
  
  const html5QrcodeRef = useRef(null);
  const lastBarcodeRef = useRef(null);
  const lastTimeRef = useRef(0);

  // play synthesised audio beep via Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz frequency
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // volume

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // duration 100ms
    } catch (e) {
      console.warn('Audio beep failed:', e);
    }
  };

  const handleScanSuccess = (decodedText) => {
    const now = Date.now();
    // 1.5s duplicate check
    if (decodedText === lastBarcodeRef.current && now - lastTimeRef.current < 1500) {
      return;
    }
    lastBarcodeRef.current = decodedText;
    lastTimeRef.current = now;

    // Trigger parent scan handler (which returns the matched product)
    const product = onScan(decodedText);
    
    // Play beep sound
    playBeep();

    // Log to session history
    setScannedSessionItems((prev) => {
      const idx = prev.findIndex((item) => item.barcode === decodedText);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      } else {
        return [
          {
            barcode: decodedText,
            name: product ? product.name : 'Unknown Product',
            quantity: 1,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
          ...prev,
        ];
      }
    });
  };

  const startScanning = async () => {
    // If scanning is already active, return
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      return;
    }

    try {
      setError('');
      if (!html5QrcodeRef.current) {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrcodeRef.current = new Html5Qrcode(SCANNER_ID);
      }

      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: Math.max(180, Math.min(280, size)), height: Math.max(180, Math.min(280, size)) };
          },
        },
        handleScanSuccess,
        (errorMessage) => {
          // ignore scanner tracking errors
        }
      );
      setScanning(true);
    } catch (err) {
      console.error('Start scanner error:', err);
      setError('Could not access camera. Please check camera permissions.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!open) {
      setScannedSessionItems([]);
      return;
    }

    // Delay start slightly to ensure DOM element is ready
    const timer = setTimeout(() => {
      startScanning();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          html5QrcodeRef.current.stop().catch(err => console.error(err));
        }
        html5QrcodeRef.current = null;
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0b0f19',
          borderRadius: 24,
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              📷
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                B2C Mobile Scanner
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>
                Continuous barcode & QR scanning
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: 10,
              color: '#94a3b8',
              width: 36,
              height: 36,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={startScanning}
              disabled={scanning}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                background: scanning ? 'rgba(16, 185, 129, 0.05)' : 'linear-gradient(135deg, #10b981, #059669)',
                color: scanning ? '#6ee7b7' : '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: scanning ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                opacity: scanning ? 0.7 : 1,
              }}
            >
              ⚡ {scanning ? 'Scanning Active' : 'Start Camera'}
            </button>
            <button
              onClick={stopScanning}
              disabled={!scanning}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: !scanning ? 'rgba(239, 68, 68, 0.05)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: !scanning ? '#fca5a5' : '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: !scanning ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                opacity: !scanning ? 0.7 : 1,
              }}
            >
              🛑 Pause Camera
            </button>
          </div>

          {/* Scanner view */}
          {error ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 16,
                padding: '24px 16px',
                color: '#fca5a5',
                textAlign: 'center',
                fontSize: 14,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
              {error}
            </div>
          ) : (
            <div
              id={SCANNER_ID}
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                minHeight: 250,
                background: '#161d30',
                border: scanning ? '2px solid #4f46e5' : '2px solid #334155',
                boxShadow: scanning ? '0 0 20px rgba(79, 70, 229, 0.25)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          )}

          {/* Format Badges */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              justifyContent: 'center',
              opacity: 0.8,
            }}
          >
            {['EAN-13', 'UPC-A', 'CODE-128', 'QR Code'].map((fmt) => (
              <span
                key={fmt}
                style={{
                  background: 'rgba(79, 70, 229, 0.15)',
                  color: '#a5b4fc',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                }}
              >
                {fmt}
              </span>
            ))}
          </div>

          {/* Session Log list */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Session Scan Log</span>
              <span style={{ color: '#818cf8', fontSize: 12, fontWeight: 500 }}>
                Total: {scannedSessionItems.reduce((acc, item) => acc + item.quantity, 0)} items
              </span>
            </div>
            {scannedSessionItems.length === 0 ? (
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '24px 16px',
                  color: '#64748b',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                No items scanned in this session yet
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingRight: 4,
                }}
              >
                {scannedSessionItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13,
                      animation: 'slideDown 0.2s ease',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                      <div style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                        Code: {item.barcode} • {item.time}
                      </div>
                    </div>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontWeight: 700,
                        fontSize: 12,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      ×{item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0 24px 24px',
            marginTop: 'auto',
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#94a3b8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
