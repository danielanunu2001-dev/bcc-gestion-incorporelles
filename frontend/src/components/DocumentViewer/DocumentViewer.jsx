import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import {
  FiX, FiDownload, FiPrinter, FiZoomIn, FiZoomOut,
  FiFileText, FiFile, FiTable, FiImage, FiArchive,
  FiChevronLeft, FiChevronRight, FiMaximize2, FiMinimize2,
  FiAlertCircle
} from 'react-icons/fi';

// IMPORTANT : Utiliser la même version pour l'API et le worker
// Version 3.11.0 est stable et compatible
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// Alternative si la version ci-dessus ne fonctionne pas, utiliser le worker local :
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.js',
//   import.meta.url,
// ).toString();

const DocumentViewer = ({ file, filename, fileType, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fullscreen, setFullscreen] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [excelSheets, setExcelSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [pdfError, setPdfError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    loadDocument();
    
    // Nettoyer l'URL lors du démontage
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [file, fileType]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);
    setPdfError(false);
    
    try {
      const fileBlob = file instanceof Blob ? file : new Blob([file]);
      
      switch (fileType?.toLowerCase()) {
        case 'pdf':
          // Nettoyer l'ancienne URL si elle existe
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }
          const url = URL.createObjectURL(fileBlob);
          setPdfUrl(url);
          setContent(url);
          break;
          
        case 'xlsx':
        case 'xls':
          await loadExcel(fileBlob);
          break;
          
        case 'docx':
        case 'doc':
          await loadWord(fileBlob);
          break;
          
        case 'csv':
          await loadCSV(fileBlob);
          break;
          
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
          const imgUrl = URL.createObjectURL(fileBlob);
          setContent(imgUrl);
          break;
          
        default:
          setContent(URL.createObjectURL(fileBlob));
      }
    } catch (err) {
      console.error('Erreur chargement document:', err);
      setError('Impossible de charger le document');
    } finally {
      setLoading(false);
    }
  };

  const loadExcel = async (blob) => {
    const data = await blob.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheets = workbook.SheetNames;
    
    const sheetData = sheets.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      return { name: sheetName, data: jsonData };
    });
    
    setExcelSheets(sheets);
    setExcelData(sheetData);
    setActiveSheet(0);
  };

  const loadWord = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    setContent(result.value);
  };

  const loadCSV = async (blob) => {
    const text = await blob.text();
    const rows = text.split('\n').map(row => row.split(','));
    setExcelData([{ name: 'CSV Data', data: rows }]);
    setExcelSheets(['CSV Data']);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(file instanceof Blob ? file : new Blob([file]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>${filename}</title></head>
        <body>${content || 'Contenu du document'}</body>
      </html>
    `);
    printWindow.print();
  };

  const toggleFullscreen = () => {
    const element = document.getElementById('document-viewer-content');
    if (!fullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setFullscreen(!fullscreen);
  };

  const onDocumentLoadSuccess = ({ numPages: pages }) => {
    setNumPages(pages);
    setPdfError(false);
  };

  const onDocumentLoadError = (err) => {
    console.error('Erreur PDF:', err);
    setPdfError(true);
    setError('Erreur de chargement du PDF. Le fichier peut être corrompu ou protégé.');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement du document...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={styles.errorContainer}>
          <FiAlertCircle size={48} color="#ef4444" />
          <p>{error}</p>
          <button onClick={handleDownload} style={styles.downloadFallbackButton}>
            <FiDownload /> Télécharger le fichier
          </button>
        </div>
      );
    }

    // PDF
    if (fileType?.toLowerCase() === 'pdf') {
      if (pdfError || !content) {
        return (
          <div style={styles.errorContainer}>
            <FiAlertCircle size={48} color="#ef4444" />
            <p>Le PDF ne peut pas être affiché</p>
            <button onClick={handleDownload} style={styles.downloadFallbackButton}>
              <FiDownload /> Télécharger le fichier
            </button>
          </div>
        );
      }
      
      return (
        <div style={styles.pdfContainer}>
          <Document
            file={content}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div style={styles.loadingText}>Chargement du PDF...</div>}
            error={<div style={styles.errorText}>Erreur de chargement</div>}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          {numPages > 1 && (
            <div style={styles.pdfNavigation}>
              <button
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                style={{ ...styles.navButton, ...(pageNumber <= 1 ? styles.navButtonDisabled : {}) }}
              >
                <FiChevronLeft /> Précédent
              </button>
              <span style={styles.pageInfo}>
                Page {pageNumber} / {numPages}
              </span>
              <button
                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
                style={{ ...styles.navButton, ...(pageNumber >= numPages ? styles.navButtonDisabled : {}) }}
              >
                Suivant <FiChevronRight />
              </button>
            </div>
          )}
        </div>
      );
    }

    // Excel
    if (excelData) {
      return (
        <div style={styles.excelContainer}>
          {excelSheets.length > 1 && (
            <div style={styles.sheetTabs}>
              {excelSheets.map((sheet, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSheet(idx)}
                  style={{
                    ...styles.sheetTab,
                    ...(activeSheet === idx ? styles.sheetTabActive : {})
                  }}
                >
                  {sheet.length > 20 ? sheet.substring(0, 17) + '...' : sheet}
                </button>
              ))}
            </div>
          )}
          <div style={styles.tableWrapper}>
            <table style={styles.excelTable}>
              <tbody>
                {excelData[activeSheet]?.data.slice(0, 100).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.slice(0, 20).map((cell, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          ...styles.excelCell,
                          ...(rowIdx === 0 ? styles.excelHeader : {})
                        }}
                      >
                        {cell !== undefined && cell !== null ? String(cell).substring(0, 50) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {excelData[activeSheet]?.data.length > 100 && (
              <div style={styles.truncateMessage}>
                <FiAlertCircle size={14} /> Affichage des 100 premières lignes uniquement
              </div>
            )}
          </div>
        </div>
      );
    }

    // Word / HTML
    if (content && typeof content === 'string' && content.includes('<')) {
      return (
        <div
          style={styles.wordContainer}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    // Images
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType?.toLowerCase())) {
      return (
        <div style={styles.imageContainer}>
          <img src={content} alt={filename} style={styles.image} onError={() => setError('Impossible d\'afficher l\'image')} />
        </div>
      );
    }

    // Autres formats
    return (
      <div style={styles.fallbackContainer}>
        <FiFile size={64} color="#94a3b8" />
        <h3>Aperçu non disponible</h3>
        <p>Ce type de fichier ne peut pas être prévisualisé dans l'application</p>
        <button onClick={handleDownload} style={styles.downloadFallbackButton}>
          <FiDownload /> Télécharger le fichier
        </button>
      </div>
    );
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        id="document-viewer-content"
        style={{ ...styles.modalContent, ...(fullscreen ? styles.fullscreen : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.fileInfo}>
            <div style={styles.fileIcon}>
              {fileType === 'pdf' && <FiFileText size={20} />}
              {['xlsx', 'xls', 'csv'].includes(fileType) && <FiTable size={20} />}
              {['docx', 'doc'].includes(fileType) && <FiFileText size={20} />}
              {['jpg', 'jpeg', 'png'].includes(fileType) && <FiImage size={20} />}
              {!fileType && <FiFile size={20} />}
            </div>
            <div style={styles.fileInfoText}>
              <h3 style={styles.filename} title={filename}>
                {filename.length > 50 ? filename.substring(0, 50) + '...' : filename}
              </h3>
              <span style={styles.fileType}>{fileType?.toUpperCase() || 'Document'}</span>
            </div>
          </div>
          
          <div style={styles.controls}>
            {(fileType === 'pdf' && !pdfError && content) && (
              <>
                <button onClick={() => setScale(Math.min(3, scale + 0.1))} style={styles.controlBtn} title="Zoom avant (+)">
                  <FiZoomIn />
                </button>
                <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} style={styles.controlBtn} title="Zoom arrière (-)">
                  <FiZoomOut />
                </button>
                <span style={styles.zoomValue}>{Math.round(scale * 100)}%</span>
              </>
            )}
            <button onClick={handleDownload} style={styles.controlBtn} title="Télécharger">
              <FiDownload />
            </button>
            <button onClick={handlePrint} style={styles.controlBtn} title="Imprimer">
              <FiPrinter />
            </button>
            <button onClick={toggleFullscreen} style={styles.controlBtn} title="Plein écran">
              {fullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
            <button onClick={onClose} style={styles.closeBtn}>
              <FiX />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    transition: 'all 0.3s ease'
  },
  fullscreen: {
    width: '100%',
    height: '100%',
    borderRadius: 0
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: 'var(--bg-secondary)',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    minWidth: 0,
    flex: 1
  },
  fileIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#e0e7ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4f46e5',
    flexShrink: 0
  },
  fileInfoText: {
    minWidth: 0,
    flex: 1
  },
  filename: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  fileType: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)'
  },
  controls: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  controlBtn: {
    padding: '0.5rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
    transition: 'all 0.2s'
  },
  closeBtn: {
    padding: '0.5rem',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--bg-card)',
    transition: 'all 0.2s'
  },
  zoomValue: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    minWidth: '45px',
    textAlign: 'center'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '1.5rem',
    backgroundColor: '#f3f4f6'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    color: '#ef4444',
    textAlign: 'center'
  },
  pdfContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  pdfNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  navButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  navButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed'
  },
  pageInfo: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)'
  },
  loadingText: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-secondary)'
  },
  errorText: {
    padding: '2rem',
    textAlign: 'center',
    color: '#ef4444'
  },
  excelContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  sheetTabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0.5rem',
    flexWrap: 'wrap'
  },
  sheetTab: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    transition: 'all 0.2s'
  },
  sheetTabActive: {
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)'
  },
  tableWrapper: {
    overflow: 'auto',
    flex: 1
  },
  excelTable: {
    borderCollapse: 'collapse',
    width: '100%',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  excelCell: {
    padding: '0.5rem',
    border: '1px solid #e5e7eb',
    fontSize: '0.75rem',
    color: 'var(--text-primary)'
  },
  excelHeader: {
    backgroundColor: 'var(--bg-primary)',
    fontWeight: '600',
    borderBottom: '2px solid #e5e7eb'
  },
  truncateMessage: {
    marginTop: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    fontSize: '0.7rem',
    color: '#92400e',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    justifyContent: 'center'
  },
  wordContainer: {
    backgroundColor: 'var(--bg-card)',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    lineHeight: '1.6',
    maxHeight: '100%',
    overflow: 'auto'
  },
  imageContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  },
  fallbackContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    textAlign: 'center'
  },
  downloadFallbackButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    marginTop: '1rem'
  }
};

// Ajout des animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default DocumentViewer;