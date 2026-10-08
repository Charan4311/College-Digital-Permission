import React, { useState } from 'react';
import { X, ExternalLink, Download, FileText, AlertCircle } from 'lucide-react';
import { buildFileUrl } from '../lib/api';

export default function DocumentViewer({
  isOpen,
  onClose,
  documentUrl,
  documentName = 'Document',
  documentMime = ''
}) {
  const [loadError, setLoadError] = useState(false);

  if (!isOpen || !documentUrl) return null;

  const fullUrl = buildFileUrl(documentUrl);
  const isPdf =
    documentMime === 'application/pdf' ||
    /\.pdf$/i.test(documentUrl) ||
    /\.pdf$/i.test(documentName);
  const isImage =
    documentMime.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(documentUrl) ||
    /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(documentName);

  const handleOpenNewTab = () => {
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '900px',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#059669" />
            <span
              style={{
                fontWeight: 700,
                fontSize: '15px',
                color: '#1e293b',
                maxWidth: '450px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {documentName || 'Attached Document'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleOpenNewTab}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1fae5',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ExternalLink size={14} />
              Open in new tab
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close document viewer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#0f172a',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '16px'
          }}
        >
          {loadError ? (
            <div
              style={{
                background: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                maxWidth: '400px'
              }}
            >
              <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '16px' }}>
                File Unavailable
              </h4>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
                File unavailable - ask the student to re-upload.
              </p>
              <button
                type="button"
                onClick={handleOpenNewTab}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#059669',
                  color: '#ffffff',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ExternalLink size={14} /> Try Direct Link
              </button>
            </div>
          ) : isPdf ? (
            <iframe
              src={fullUrl}
              title={documentName}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#ffffff'
              }}
              onError={() => setLoadError(true)}
            />
          ) : isImage ? (
            <img
              src={fullUrl}
              alt={documentName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '6px'
              }}
              onError={() => setLoadError(true)}
            />
          ) : (
            <div
              style={{
                background: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                maxWidth: '420px'
              }}
            >
              <FileText size={48} color="#059669" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '16px' }}>
                {documentName}
              </h4>
              <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13px' }}>
                This file format cannot be previewed directly in the browser.
              </p>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: '#059669',
                  color: '#ffffff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <Download size={16} /> Open / Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
