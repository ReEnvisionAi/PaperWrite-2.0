import React, { useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, FileText, X, Upload } from 'lucide-react'; // FileText can be removed if not used elsewhere
import { DocumentRow, InputCategory } from '../types';

interface DocumentGridProps {
  rows: DocumentRow[];
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateInput: (id: string, input: string) => void;
  onUpdatePrompt: (id: string, field: keyof DocumentRow['aiPrompt'], value: string | number) => void;
  onUpdateOutput: (id: string, output: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleInputExpand: (id: string, category: InputCategory) => void;
  onUpdateSectionInput: (id: string, category: InputCategory, index: number, value: string) => void;
  onAddSectionInput: (id: string, category: InputCategory) => void;
  onRemoveSectionInput: (id: string, category: InputCategory, index: number) => void;
  onGenerateText: (id: string) => void;
  // onViewFullDocument prop removed
  onImportDocument: (text: string) => void;
  isGeneratingDisabled?: boolean;
}

const categories: { key: InputCategory; label: string }[] = [
  { key: 'facts', label: 'Facts' },
  { key: 'concepts', label: 'Concepts' },
  { key: 'opinions', label: 'Opinions' },
  { key: 'examples', label: 'Examples' },
  { key: 'other', label: 'Other' },
];

export function DocumentGrid({
  rows,
  onAddRow,
  onDeleteRow,
  onUpdateTitle,
  onUpdateInput,
  onUpdatePrompt,
  onUpdateOutput, // Keep this prop, might be used by direct generation later
  onToggleExpand,
  onToggleInputExpand,
  onUpdateSectionInput,
  onAddSectionInput,
  onRemoveSectionInput,
  onGenerateText,
  // onViewFullDocument prop removed
  onImportDocument,
  isGeneratingDisabled = false,
}: DocumentGridProps) {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      onImportDocument(text);
      if (fileInputRefs.current[id]) {
        fileInputRefs.current[id]!.value = '';
      }
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const renderInputCategory = (row: DocumentRow, category: InputCategory, label: string) => {
    const inputs = row.sectionInputs[category];
    const isExpanded = row.expandedInputs[category];

    return (
      <div key={category} className="mb-4">
        <div
          className="flex items-center justify-between cursor-pointer p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          onClick={() => onToggleInputExpand(row.id, category)}
        >
          <span className="text-white font-medium">{label}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-300" />
          )}
        </div>
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {inputs.map((input, index) => (
              <div key={index} className="flex items-center space-x-2">
                <textarea
                  value={input}
                  onChange={(e) =>
                    onUpdateSectionInput(row.id, category, index, e.target.value)
                  }
                  className="flex-1 p-2 bg-gray-600 text-white rounded custom-scrollbar min-h-[60px] resize-y border border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  rows={2}
                />
                {inputs.length > 1 && (
                  <button
                    onClick={() => onRemoveSectionInput(row.id, category, index)}
                    className="p-1 text-gray-400 hover:text-red-400"
                    title={`Remove ${label}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => onAddSectionInput(row.id, category)}
              className="w-full p-2 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 flex items-center justify-center text-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Add {label}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* "View Full Document" button removed from here */}

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="bg-gray-200 dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          {/* Section Header */}
          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            {/* Left side: Section Number, Title Input, Metadata */}
            <div className="flex-grow flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <span className="text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                Section {index + 1}
              </span>
              {/* Title Input */}
              <input
                type="text"
                value={row.title}
                onChange={(e) => onUpdateTitle(row.id, e.target.value)}
                className="flex-grow w-full sm:w-auto p-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm sm:text-base"
                placeholder="Enter section title..."
              />
              {/* Metadata */}
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                <span>{row.aiPrompt.wordCount} words</span>
                <span>•</span>
                <span className="capitalize">{row.aiPrompt.tone} tone</span>
              </div>
            </div>

            {/* Right side: Action Buttons */}
            <div className="flex items-center space-x-2 self-end sm:self-center">
              <button
                onClick={() => onToggleExpand(row.id)}
                className="flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm"
              >
                {row.isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Expand
                  </>
                )}
              </button>
              <button
                onClick={() => onDeleteRow(row.id)}
                disabled={rows.length <= 1}
                className={`flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs sm:text-sm ${rows.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Delete
              </button>
            </div>
          </div>

          {/* Collapsible Content Area */}
          {row.isExpanded && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-300 dark:border-gray-700">
              {/* Context/Prompt Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Context */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
                    Context
                  </h3>
                  <div className="space-y-2">
                    {categories.map((category) =>
                      renderInputCategory(row, category.key, category.label)
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={el => fileInputRefs.current[row.id] = el}
                      onChange={e => handleFileUpload(e, row.id)}
                      accept=".txt,.md,.rtf"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRefs.current[row.id]?.click()}
                      className="w-full p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 flex items-center justify-center text-sm"
                    >
                      <Upload className="w-4 h-4 mr-1" /> Import Text File (.txt, .md)
                    </button>
                    <textarea
                      value={row.input}
                      onChange={(e) => onUpdateInput(row.id, e.target.value)}
                      className="w-full h-20 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg resize-y custom-scrollbar border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter your base text or import a file..."
                    />
                  </div>
                </div>

                {/* Right Column - Prompt */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
                    Prompt
                  </h3>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Word Count Target</label>
                    <input
                      type="number"
                      value={row.aiPrompt.wordCount}
                      onChange={(e) => onUpdatePrompt(row.id, 'wordCount', parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Approx words"
                      min="10"
                    />
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tone</label>
                    <select
                      value={row.aiPrompt.tone}
                      onChange={(e) => onUpdatePrompt(row.id, 'tone', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                      <option value="friendly">Friendly</option>
                      <option value="informative">Informative</option>
                      <option value="persuasive">Persuasive</option>
                    </select>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt</label>
                    <textarea
                      value={row.aiPrompt.prompt}
                      onChange={(e) => onUpdatePrompt(row.id, 'prompt', e.target.value)}
                      className="w-full h-40 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded resize-y custom-scrollbar border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., focus on benefits, mention specific product..."
                    />
                    <button
                      onClick={() => onGenerateText(row.id)}
                      disabled={row.isLoading || isGeneratingDisabled}
                      className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title={isGeneratingDisabled ? "OpenAI not initialized. Check .env settings." : "Generate text for this section"}
                    >
                      {row.isLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        'Generate Text'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generated Output Section (Always Visible) */}
          <div className={`px-4 pb-4 ${row.isExpanded ? 'pt-4 border-t border-gray-300 dark:border-gray-700' : 'pt-2'}`}>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg min-h-[100px] p-4">
              {row.error ? (
                <p className="text-red-500 dark:text-red-400 text-sm">{row.error}</p>
              ) : (
                // Use dangerouslySetInnerHTML to render HTML content
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-300 custom-scrollbar leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: row.output || '<p class="text-gray-500 dark:text-gray-400 italic">No output generated yet.</p>' }}
                />
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={onAddRow}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
      >
        <Plus className="w-5 h-5 mr-2" /> Add New Section
      </button>
    </div>
  );
}
