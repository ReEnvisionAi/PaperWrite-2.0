import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Layout, LayoutList, Printer, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { DocumentRow } from '../types';
import { RichTextEditor } from './RichTextEditor';

interface FullDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: DocumentRow[];
  onUpdateRow: (id: string, output: string) => void;
  onUpdateAllRows: (updatedRows: DocumentRow[]) => void; // Prop to update all rows
}

export function FullDocumentModal({ isOpen, onClose, rows, onUpdateRow, onUpdateAllRows }: FullDocumentModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState<'sections' | 'continuous'>('sections');
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [continuousContent, setContinuousContent] = useState('');
  const [syncStatus, setSyncStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Combine content for continuous view when rows or viewMode change
  useEffect(() => {
    if (viewMode === 'continuous') {
      const combinedHtml = rows.map(row =>
        `<h2>${row.title || 'Untitled Section'}</h2>\n${row.output}`
      ).join('\n<hr class="my-4 border-gray-700">\n');
      setContinuousContent(combinedHtml);
      setSyncStatus({ type: 'idle', message: '' }); // Reset sync status when switching views/data
    }
  }, [rows, viewMode]);


  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    // Clear sync message after a few seconds
    if (syncStatus.type === 'success' || syncStatus.type === 'error') {
      const timer = setTimeout(() => {
        setSyncStatus({ type: 'idle', message: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  if (!isOpen) return null;

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleContinuousChange = (htmlContent: string) => {
    setContinuousContent(htmlContent);
    setSyncStatus({ type: 'idle', message: '' }); // Reset status on edit
  };

  const handleSyncContinuousChanges = () => {
    setSyncStatus({ type: 'idle', message: '' }); // Clear previous status
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${continuousContent}</div>`, 'text/html'); // Wrap in div for easier parsing
      const parsedNodes = doc.body.firstChild?.childNodes; // Get nodes within the wrapper div

      if (!parsedNodes) {
        throw new Error("Could not parse content.");
      }

      const newSectionsData: { title: string; outputHTML: string }[] = [];
      let currentSection: { title: string; outputHTML: string } | null = null;

      parsedNodes.forEach(node => {
        if (node.nodeName === 'H2') {
          // Start a new section
          currentSection = { title: (node.textContent || 'Untitled Section').trim(), outputHTML: '' };
          newSectionsData.push(currentSection);
        } else if (currentSection && node.nodeName !== 'HR') {
          // Append content to the current section (ignore HR tags)
          // Use outerHTML to preserve formatting
          currentSection.outputHTML += (node as Element).outerHTML || node.textContent || '';
        } else if (!currentSection && node.nodeName !== 'HR' && node.textContent?.trim()) {
           // Content before the first H2 - potentially add to first section or handle differently
           console.warn("Content found before the first H2:", node.textContent);
           // For now, we'll implicitly add it to the first section if one exists later
           if (newSectionsData.length === 0) {
             // Preemptively create a section if none exists yet
             currentSection = { title: 'Untitled Section', outputHTML: '' };
             newSectionsData.push(currentSection);
           }
           if (currentSection) {
             currentSection.outputHTML += (node as Element).outerHTML || node.textContent || '';
           }
        }
      });

      // Trim leading/trailing whitespace/newlines from outputHTML for each section
      newSectionsData.forEach(section => {
        section.outputHTML = section.outputHTML.trim();
      });

      console.log("Parsed Sections:", newSectionsData);
      console.log("Original Row Count:", rows.length);

      // --- Validation ---
      if (newSectionsData.length !== rows.length) {
        throw new Error(`Parsing resulted in ${newSectionsData.length} sections, but expected ${rows.length}. Structure may have been changed too much. Sync aborted.`);
      }

      // --- Update Original Rows ---
      const updatedRows = rows.map((originalRow, index) => {
        const newData = newSectionsData[index];
        if (!newData) return originalRow; // Should not happen if lengths match, but safety check

        // Only update if title or output actually changed to avoid unnecessary re-renders
        if (originalRow.title !== newData.title || originalRow.output !== newData.outputHTML) {
          return {
            ...originalRow,
            title: newData.title,
            output: newData.outputHTML,
          };
        }
        return originalRow;
      });

      onUpdateAllRows(updatedRows);
      setSyncStatus({ type: 'success', message: 'Changes synced successfully!' });

    } catch (error) {
      console.error("Error syncing continuous changes:", error);
      setSyncStatus({ type: 'error', message: error instanceof Error ? error.message : "Sync failed." });
    }
  };


  const renderSectionsView = () => (
    <div className="space-y-8">
      {rows.map((row) => (
        <div key={row.id} className="section-container">
          <h3 className="text-xl font-semibold text-white mb-3 border-b border-gray-700 pb-2">
            {row.title || 'Untitled Section'}
          </h3>
          <RichTextEditor
            content={row.output}
            onChange={(htmlContent) => onUpdateRow(row.id, htmlContent)}
            editable={true}
          />
        </div>
      ))}
    </div>
  );

  const renderContinuousView = () => {
    return (
       <RichTextEditor
         content={continuousContent}
         onChange={handleContinuousChange}
         editable={true}
       />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:bg-transparent print:p-0">
      <div
        className={`bg-gray-900 rounded-lg w-full ${
          isFullScreen ? 'h-screen m-0 rounded-none' : 'max-w-4xl max-h-[80vh]'
        } flex flex-col print:max-h-none print:h-auto print:shadow-none print:rounded-none print:bg-white print:text-black`}
        id="printable-modal-content"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0 print:hidden">
          {/* Left Side: Title & View Mode */}
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-white">Full Document</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('sections')}
                className={`flex items-center px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'sections'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
                title="Sections View (Editable)"
              >
                <LayoutList className="w-4 h-4 mr-2" /> Sections
              </button>
              <button
                onClick={() => setViewMode('continuous')}
                className={`flex items-center px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'continuous'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
                title="Continuous View (Editable)"
              >
                <Layout className="w-4 h-4 mr-2" /> Continuous
              </button>
            </div>
          </div>
          {/* Right Side: Actions */}
          <div className="flex items-center space-x-2">
            {/* Sync Button - Only in Continuous View */}
            {viewMode === 'continuous' && (
              <button
                onClick={handleSyncContinuousChanges}
                className="flex items-center px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                title="Parse edits and update sections"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Sync Changes
              </button>
            )}
            <button onClick={handlePrint} className="p-2 hover:bg-gray-800 rounded-full" title="Print Document">
              <Printer className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={toggleFullScreen} className="p-2 hover:bg-gray-800 rounded-full">
              {isFullScreen ? <Minimize2 className="w-5 h-5 text-gray-400" /> : <Maximize2 className="w-5 h-5 text-gray-400" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Sync Status Message */}
        {syncStatus.type !== 'idle' && (
          <div className={`p-2 text-center text-sm ${syncStatus.type === 'success' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
             <div className="flex items-center justify-center">
               {syncStatus.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
               {syncStatus.message}
             </div>
          </div>
        )}


        {/* Content Area */}
        <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 custom-scrollbar print:overflow-visible print:p-8 print:bg-white">
          {viewMode === 'sections' ? renderSectionsView() : renderContinuousView()}
        </div>
      </div>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-modal-content, #printable-modal-content * { visibility: visible; }
          #printable-modal-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 1cm; border: none; box-shadow: none; color: black !important; background-color: white !important; }
          #printable-modal-content .prose { color: black; }
          #printable-modal-content .prose h2, #printable-modal-content .prose h3 { color: black; border-color: #ccc; }
          #printable-modal-content .prose blockquote { border-left-color: #ccc; }
          #printable-modal-content .prose code { background-color: #f3f4f6; color: #1f2937; }
          #printable-modal-content .prose pre { background-color: #f3f4f6; color: #1f2937; }
          .rich-text-editor > div:first-child { display: none; } /* Hide toolbar */
          .rich-text-editor { border: none !important; }
          .tiptap { min-height: auto !important; padding: 0 !important; }
          #printable-modal-content hr { border-color: #ccc !important; border-top-width: 1px !important; visibility: visible !important; }
        }
      `}</style>
    </div>
  );
}
