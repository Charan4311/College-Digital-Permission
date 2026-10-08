import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function ZoomableTableWrapper({
  children,
  className = '',
  style = {},
  minZoom = 0.5,
  maxZoom = 1.5,
  step = 0.1,
  showControls = true,
  tableWrapperClass = 'table-wrapper',
  tableWrapperStyle = {}
}) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoom((prev) => Math.min(Number((prev + step).toFixed(2)), maxZoom));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoom((prev) => Math.max(Number((prev - step).toFixed(2)), minZoom));
  };

  const handleReset = (e) => {
    e?.stopPropagation();
    setZoom(1);
  };

  return (
    <div className={`zoomable-table-container ${className}`} style={{ width: '100%', maxWidth: '100%', ...style }}>
      {showControls && (
        <div className="table-zoom-toolbar" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 12px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '11px',
          color: '#64748b',
          flexWrap: 'wrap'
        }}>
          <span className="table-zoom-hint" style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 700, color: '#10b981' }}>⇄</span>
            <span>Scroll left/right to view all columns</span>
          </span>

          <div className="table-zoom-controls" style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '2px 4px',
            gap: '3px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            marginLeft: 'auto'
          }}>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= minZoom}
              title="Zoom out table"
              aria-label="Zoom out table"
              style={{
                border: 'none',
                background: 'none',
                cursor: zoom <= minZoom ? 'not-allowed' : 'pointer',
                opacity: zoom <= minZoom ? 0.35 : 1,
                padding: '3px 5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                borderRadius: '4px',
                transition: 'background 0.15s'
              }}
            >
              <ZoomOut size={13} />
            </button>

            <span
              onClick={handleReset}
              title="Click to reset zoom to 100%"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: zoom !== 1 ? '#059669' : '#475569',
                minWidth: '38px',
                textAlign: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                padding: '0 2px'
              }}
            >
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= maxZoom}
              title="Zoom in table"
              aria-label="Zoom in table"
              style={{
                border: 'none',
                background: 'none',
                cursor: zoom >= maxZoom ? 'not-allowed' : 'pointer',
                opacity: zoom >= maxZoom ? 0.35 : 1,
                padding: '3px 5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                borderRadius: '4px',
                transition: 'background 0.15s'
              }}
            >
              <ZoomIn size={13} />
            </button>

            {zoom !== 1 && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset zoom to 100%"
                aria-label="Reset zoom"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '3px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  borderRadius: '4px'
                }}
              >
                <RotateCcw size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={tableWrapperClass}
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          ...tableWrapperStyle
        }}
      >
        <div
          className="table-zoom-content"
          style={{
            zoom: zoom,
            minWidth: zoom > 1 ? 'max-content' : '100%',
            transition: 'zoom 0.12s ease',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
