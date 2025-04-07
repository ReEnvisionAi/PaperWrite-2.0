import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Trash2, Clock } from 'lucide-react';
import { SavedDocument } from '../types'; // Assuming SavedDocument includes id

interface DocumentManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  onOpen: (document: SavedDocument) => void;
  onDelete: (id: string) => void;
  savedDocuments: SavedDocument[];
  currentDocument?: SavedDocument; // Make optional
}

export function DocumentManageModal({
  isOpen,
  onClose,
  onSave,
  onOpen,
  onDelete,
  savedDocuments,
  currentDocument, // Can be undefined now
}: DocumentManageModalProps) {
  const [newTitle, setNewTitle] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    // Initialize title input based on currentDocument if it exists
    if (isOpen) {
      setNewTitle(currentDocument?.title || ''); // Use optional chaining and default to empty string
    }
    // Reset confirm delete state when modal opens/closes or current doc changes
    setShowConfirmDelete(null);
  }, [isOpen, currentDocument]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (newTitle.trim()) {
      onSave(newTitle.trim());
      // Don't clear newTitle here, might be confusing if saving an existing doc
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const handleDelete = (id: string) => {
    if (showConfirmDelete === id) {
      onDelete(id);
      setShowConfirmDelete(null); // Reset after delete
    } else {
      setShowConfirmDelete(id); // Show confirm for this ID
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">Document Manager</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {/* Save Section */}
          <div className="mb-6 pb-4 border-b border-gray-700">
             <label htmlFor="docTitle" className="block text-sm font-medium text-gray-300 mb-1">
               {currentDocument ? 'Update Title & Save' : 'Save New Document As'}
             </label>
            <div className="flex items-center space-x-2">
              <input
                id="docTitle"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter document title..."
                className="flex-1 p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleSave}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shrink-0"
              >
                <Save className="w-4 h-4 mr-2" />
                {currentDocument ? 'Save Changes' : 'Save New'}
              </button>
            </div>
          </div>

          {/* Saved Documents List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-2">Saved Documents</h3>
            {savedDocuments.length === 0 ? (
              <p className="text-gray-400">No saved documents found.</p>
            ) : (
              <div className="space-y-2">
                {savedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg flex items-center justify-between group transition-colors ${
                      currentDocument?.id === doc.id ? 'bg-blue-900 bg-opacity-50' : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <h4 className={`font-medium truncate ${currentDocument?.id === doc.id ? 'text-white' : 'text-gray-200'}`}>{doc.title}</h4>
                      <div className="flex items-center text-xs text-gray-400 space-x-3 mt-1">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(doc.updatedAt)}
                        </span>
                        <span>{doc.rows.length} sections</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => onOpen(doc)}
                        title="Open Document"
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title={showConfirmDelete === doc.id ? 'Confirm Delete' : 'Delete Document'}
                        className={`p-2 rounded transition-colors ${
                          showConfirmDelete === doc.id
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'text-gray-400 hover:text-red-500 hover:bg-gray-600'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
