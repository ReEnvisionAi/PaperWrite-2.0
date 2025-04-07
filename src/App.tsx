import React, { useState, useEffect, useCallback } from 'react';
import { DocumentGrid } from './components/DocumentGrid';
import { ThemeToggle } from './components/ThemeToggle';
import { FullDocumentModal } from './components/FullDocumentModal';
import { DocumentManageModal } from './components/DocumentManageModal';
import { DocumentRow, Theme, InputCategory, SavedDocument } from './types';
import { Save, Loader2, AlertTriangle, Wifi, WifiOff, Database, HardDrive, X, FileText } from 'lucide-react'; // Added FileText
import { initializeOpenAI, generateText } from './services/openai';
import { useSupabase } from '@reenvision-ai/reai-os-sdk'; // Corrected import path
import { SupabaseClient } from '@supabase/supabase-js';
import { getItem, setItem } from './hooks/useLocalStorage'; // Import helpers

// Define the structure expected from Supabase (matches table structure)
interface SupabaseDocument {
  id: string;
  user_id: string;
  title: string;
  rows: DocumentRow[]; // Assuming 'rows' column is jsonb storing DocumentRow[]
  created_at: string;
  updated_at: string;
}

// Map Supabase structure to SavedDocument structure used in the frontend
const mapSupabaseToSavedDocument = (doc: SupabaseDocument): SavedDocument => ({
  id: doc.id,
  title: doc.title,
  rows: doc.rows,
  createdAt: doc.created_at,
  updatedAt: doc.updated_at,
});

const createInitialRow = (id: string = Date.now().toString(), input: string = '', title: string = ''): DocumentRow => ({
  id,
  title: title || `Section ${id.substring(0, 4)}`,
  input,
  aiPrompt: { wordCount: 100, tone: 'professional', prompt: '' },
  output: '',
  isExpanded: true,
  isLoading: false,
  sectionInputs: { facts: [''], concepts: [''], opinions: [''], examples: [''], other: [''] },
  expandedInputs: { facts: false, concepts: false, opinions: false, examples: false, other: false },
});

// Constants for localStorage keys
const LOCAL_ROWS_KEY = 'document-rows';
const LOCAL_SAVED_DOCS_KEY = 'saved-documents';
const LOCAL_CURRENT_DOC_ID_KEY = 'current-document-id';

type OperatingMode = 'loading' | 'supabase' | 'local' | 'error';

function App() {
  // --- Local UI State ---
  const [theme, setThemeState] = useState<Theme>(() => getItem('theme', 'dark'));
  const [showFullDocument, setShowFullDocument] = useState(false);
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('loading');
  const [appError, setAppError] = useState<string | null>(null);

  // --- Document State (Managed via Supabase OR LocalStorage) ---
  const [rows, setRows] = useState<DocumentRow[]>([createInitialRow()]);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  // --- OpenAI State ---
  const [isAiInitialized, setIsAiInitialized] = useState(false);
  const [aiInitializationError, setAiInitializationError] = useState<string | null>(null);

  // --- Supabase SDK Hook ---
  const { supabase, error: supabaseError, loading: supabaseLoading, isInitialized: supabaseInitialized } = useSupabase({
    appId: 'business-writer',
  });

  // --- Effects ---

  // Initialize OpenAI
  useEffect(() => {
    try {
      initializeOpenAI();
      setIsAiInitialized(true);
      setAiInitializationError(null);
      console.log("OpenAI initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize OpenAI:", error);
      setAiInitializationError(error instanceof Error ? error.message : "An unknown error occurred during OpenAI initialization.");
      setIsAiInitialized(false);
    }
  }, []);

  // Update Theme in localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  useEffect(() => { // Apply theme on initial load
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
  }, [theme]);


  // --- Data Loading Logic ---
  const loadFromSupabase = useCallback(async (client: SupabaseClient) => {
    console.log("Attempting to load data from Supabase...");
    setOperatingMode('loading');
    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) {
        throw userError || new Error("User not authenticated.");
      }

      const { data, error } = await client
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      console.log("Successfully loaded documents from Supabase:", data);
      const mappedDocs = data.map(mapSupabaseToSavedDocument);
      setSavedDocuments(mappedDocs);

      // Try to load the last opened document if an ID exists (optional)
      // For simplicity, we'll just load the list for now. User can open manually.
      // Resetting current doc on load.
      setRows([createInitialRow()]);
      setCurrentDocumentId(null);

      setOperatingMode('supabase');
      setAppError(null);
    } catch (error) {
      console.error("Error loading data from Supabase:", error);
      setAppError(`Failed to load data from Supabase: ${error instanceof Error ? error.message : String(error)}`);
      setOperatingMode('error'); // Set error state
      // Do NOT fall back to local storage here, let the main effect handle it
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    console.log("Supabase connection failed or unavailable. Loading data from LocalStorage...");
    setOperatingMode('loading');
    try {
      const localRows = getItem<DocumentRow[]>(LOCAL_ROWS_KEY, [createInitialRow()]);
      const localSavedDocs = getItem<SavedDocument[]>(LOCAL_SAVED_DOCS_KEY, []);
      const localCurrentId = getItem<string | null>(LOCAL_CURRENT_DOC_ID_KEY, null);

      setRows(localRows);
      setSavedDocuments(localSavedDocs);
      setCurrentDocumentId(localCurrentId);

      // If a current ID exists, try to load its rows from the saved docs
      if (localCurrentId) {
        const currentDoc = localSavedDocs.find(doc => doc.id === localCurrentId);
        if (currentDoc) {
          setRows(currentDoc.rows);
        } else {
          // ID exists but doc doesn't, reset
          setCurrentDocumentId(null);
          setRows([createInitialRow()]);
          setItem(LOCAL_CURRENT_DOC_ID_KEY, null); // Clean up inconsistent state
        }
      } else if (localRows.length === 0 || (localRows.length === 1 && !localRows[0].input && !localRows[0].output)) {
         // Ensure there's always at least one initial row if loading empty state
         setRows([createInitialRow()]);
      }


      console.log("Loaded data from LocalStorage.");
      setOperatingMode('local');
      setAppError(null); // Clear any previous Supabase errors
    } catch (error) {
       console.error("Error loading data from LocalStorage:", error);
       setAppError(`Failed to load data from LocalStorage: ${error instanceof Error ? error.message : String(error)}`);
       setOperatingMode('error');
    }
  }, []);

  // Effect to determine mode and load initial data
  useEffect(() => {
    if (supabaseLoading) {
      setOperatingMode('loading');
      return;
    }

    if (supabase && supabaseInitialized) {
      // Attempt to load from Supabase
      loadFromSupabase(supabase);
    } else {
      // If Supabase isn't available/initialized after loading, fall back to localStorage
      if (supabaseError) {
         console.warn("Supabase SDK Error:", supabaseError.message);
         setAppError(`Supabase SDK Error: ${supabaseError.message}. Falling back to local storage.`);
      } else {
         console.warn("Supabase client not available or not initialized. Falling back to local storage.");
         setAppError("Supabase connection unavailable. Using local storage.");
      }
      loadFromLocalStorage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, supabaseLoading, supabaseError, supabaseInitialized]); // Dependencies control when this effect re-runs


  // --- Persistence Logic ---

  // Save current state to localStorage (used in 'local' mode)
  const saveStateToLocalStorage = useCallback(() => {
    console.log("Saving state to LocalStorage...");
    setItem(LOCAL_ROWS_KEY, rows);
    setItem(LOCAL_SAVED_DOCS_KEY, savedDocuments);
    setItem(LOCAL_CURRENT_DOC_ID_KEY, currentDocumentId);
  }, [rows, savedDocuments, currentDocumentId]);

  // Effect to save to localStorage whenever relevant state changes *in local mode*
  useEffect(() => {
    if (operatingMode === 'local') {
      saveStateToLocalStorage();
    }
  }, [operatingMode, saveStateToLocalStorage]); // Depend on the function itself


  // --- Document Row Handlers (These modify state directly, persistence happens elsewhere) ---
  const handleAddRow = () => {
    const newRow = createInitialRow();
    setRows(prevRows => [...prevRows, newRow]);
  };
  const handleDeleteRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prevRows => prevRows.filter(row => row.id !== id));
    }
  };
  const handleUpdateTitle = (id: string, title: string) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, title } : row));
  };
  const handleUpdateInput = (id: string, input: string) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, input } : row));
  };
  const handleUpdatePrompt = (id: string, field: keyof DocumentRow['aiPrompt'], value: string | number) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, aiPrompt: { ...row.aiPrompt, [field]: value } } : row));
  };
  const handleUpdateOutput = (id: string, output: string) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, output } : row));
  };
  const handleUpdateAllRows = (updatedRows: DocumentRow[]) => {
    setRows(updatedRows);
  };
  const handleToggleExpand = (id: string) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, isExpanded: !row.isExpanded } : row));
  };
  const handleToggleInputExpand = (id: string, category: InputCategory) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, expandedInputs: { ...row.expandedInputs, [category]: !row.expandedInputs[category] } } : row));
  };
  const handleUpdateSectionInput = (id: string, category: InputCategory, index: number, value: string) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, sectionInputs: { ...row.sectionInputs, [category]: row.sectionInputs[category].map((input, i) => i === index ? value : input) } } : row));
  };
  const handleAddSectionInput = (id: string, category: InputCategory) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, sectionInputs: { ...row.sectionInputs, [category]: [...row.sectionInputs[category], ''] } } : row));
  };
  const handleRemoveSectionInput = (id: string, category: InputCategory, index: number) => {
    setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, sectionInputs: { ...row.sectionInputs, [category]: row.sectionInputs[category].filter((_, i) => i !== index) } } : row));
  };

  // --- AI Generation Handler ---
  const handleGenerateText = async (id: string) => {
     if (!isAiInitialized) {
      setRows(prevRows => prevRows.map(r => r.id === id ? { ...r, error: "OpenAI client not initialized.", isLoading: false } : r));
      return;
    }
    const row = rows.find(r => r.id === id);
    if (!row) return;
    setRows(prevRows => prevRows.map(r => r.id === id ? { ...r, isLoading: true, error: undefined } : r));
    try {
      const generatedText = await generateText(row);
      // Use functional update to ensure we're working with the latest state
      setRows(prevRows => prevRows.map(r => r.id === id ? { ...r, output: generatedText, isLoading: false } : r));
    } catch (error) {
      console.error("Error in handleGenerateText:", error);
      setRows(prevRows => prevRows.map(r => r.id === id ? { ...r, error: (error instanceof Error ? error.message : "An unknown error occurred"), isLoading: false } : r));
    }
  };

  // --- Import Handler ---
  const handleImportDocument = (text: string) => {
    setRows(prevRows => {
      const currentRow = prevRows[prevRows.length - 1];
      if (currentRow && !currentRow.input.trim()) {
        return prevRows.map((row, index) => index === prevRows.length - 1 ? { ...row, input: text } : row);
      } else {
        const newRow = createInitialRow(Date.now().toString(), text);
        return [...prevRows, newRow];
      }
    });
  };

  // --- CRUD Handlers (Conditional Logic) ---

  const handleSaveDocument = async (title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return; // Don't save empty titles

    if (operatingMode === 'supabase' && supabase) {
      // --- Save to Supabase ---
      setOperatingMode('loading'); // Indicate saving
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error("User not authenticated.");

        const documentData = { user_id: user.id, title: trimmedTitle, rows };
        let savedDocData: SupabaseDocument | null = null;

        if (currentDocumentId) {
          const { data, error } = await supabase.from('documents').update(documentData).eq('id', currentDocumentId).select().single();
          if (error) throw error;
          savedDocData = data;
          console.log("Document updated in Supabase:", savedDocData);
        } else {
          const { data, error } = await supabase.from('documents').insert(documentData).select().single();
          if (error) throw error;
          savedDocData = data;
          setCurrentDocumentId(savedDocData.id); // Set new ID
          console.log("Document created in Supabase:", savedDocData);
        }
        await loadFromSupabase(supabase); // Refresh list and set mode back to 'supabase'
        setShowDocumentManager(false);
      } catch (error) {
        console.error("Error saving document to Supabase:", error);
        setAppError(error instanceof Error ? error.message : "Failed to save document to Supabase.");
        setOperatingMode('error'); // Or back to 'supabase' if preferred after error
      }
    } else if (operatingMode === 'local') {
      // --- Save to LocalStorage ---
      const now = new Date().toISOString();
      let newDocId = currentDocumentId;

      setSavedDocuments(prevDocs => {
        const existingDocIndex = currentDocumentId ? prevDocs.findIndex(doc => doc.id === currentDocumentId) : -1;
        let updatedDocs;

        if (existingDocIndex > -1) {
          // Update existing
          updatedDocs = [...prevDocs];
          updatedDocs[existingDocIndex] = { ...prevDocs[existingDocIndex], title: trimmedTitle, rows, updatedAt: now };
          console.log("Document updated in LocalStorage:", updatedDocs[existingDocIndex]);
        } else {
          // Create new
          const newDoc: SavedDocument = { id: Date.now().toString(), title: trimmedTitle, rows, createdAt: now, updatedAt: now };
          newDocId = newDoc.id; // Capture the new ID
          updatedDocs = [...prevDocs, newDoc];
           console.log("Document created in LocalStorage:", newDoc);
        }
         // Sort by updated date after modification
        return updatedDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      if (newDocId !== currentDocumentId) {
         setCurrentDocumentId(newDocId); // Update current ID if it was a new doc
      }
      setShowDocumentManager(false);
      // State update triggers useEffect to save to localStorage
    } else {
      setAppError("Cannot save document. Application is not in a valid state.");
    }
  };

  const handleOpenDocument = (document: SavedDocument) => {
    // This action just updates the state, persistence is handled elsewhere
    setRows(document.rows);
    setCurrentDocumentId(document.id);
    setShowDocumentManager(false);
  };

  const handleDeleteDocument = async (id: string) => {
    if (operatingMode === 'supabase' && supabase) {
      // --- Delete from Supabase ---
      setOperatingMode('loading');
      try {
        const { error } = await supabase.from('documents').delete().eq('id', id);
        if (error) throw error;
        console.log("Document deleted from Supabase:", id);
        if (currentDocumentId === id) {
          setCurrentDocumentId(null);
          setRows([createInitialRow()]);
        }
        await loadFromSupabase(supabase); // Refresh list
      } catch (error) {
        console.error("Error deleting document from Supabase:", error);
        setAppError(error instanceof Error ? error.message : "Failed to delete document from Supabase.");
        setOperatingMode('error'); // Or 'supabase'
      }
    } else if (operatingMode === 'local') {
      // --- Delete from LocalStorage ---
      setSavedDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
      if (currentDocumentId === id) {
        setCurrentDocumentId(null);
        setRows([createInitialRow()]);
      }
      // State update triggers useEffect to save to localStorage
    } else {
       setAppError("Cannot delete document. Application is not in a valid state.");
    }
  };

  const handleNewDocument = () => {
    // This action just updates the state, persistence is handled elsewhere
    setCurrentDocumentId(null);
    setRows([createInitialRow()]);
  };

  // --- Render Logic ---

  const renderAppStatus = () => {
    // Loading takes precedence
    if (operatingMode === 'loading') {
      return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      );
    }
    // General App Errors
    if (appError && operatingMode === 'error') { // Show general errors only in error state
      return (
         <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 flex items-center justify-between">
           <div className="flex items-center">
             <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
             <span>Error: {appError}</span>
           </div>
           {/* Optionally add a dismiss button or retry logic */}
         </div>
      );
    }
     // AI Init Errors (shown regardless of operating mode if present)
     if (aiInitializationError) {
      return (
         <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-lg z-50 flex items-center justify-between">
           <div className="flex items-center">
             <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
             <span>OpenAI Error: {aiInitializationError}</span>
           </div>
           <button onClick={() => setAiInitializationError(null)} className="ml-4 text-yellow-700 hover:text-yellow-900">
             <X className="w-5 h-5" />
           </button>
         </div>
      );
    }
    return null;
  };

  const renderModeIndicator = () => {
     let Icon = Loader2;
     let text = "Loading...";
     let color = "text-gray-500";
     let bgColor = "bg-gray-700";
     let title = "Attempting to connect and load data...";

     if (operatingMode === 'supabase') {
        Icon = Wifi;
        text = "Online";
        color = "text-green-400";
        bgColor = "bg-green-900";
        title = "Connected to Supabase";
     } else if (operatingMode === 'local') {
        Icon = WifiOff;
        text = "Offline";
        color = "text-yellow-400";
        bgColor = "bg-yellow-900";
        title = "Using Local Storage (Supabase connection unavailable)";
     } else if (operatingMode === 'error') {
         Icon = AlertTriangle;
         text = "Error";
         color = "text-red-400";
         bgColor = "bg-red-900";
         title = `Error: ${appError || 'Unknown error'}`;
     }

     return (
        <div
            title={title}
            className={`fixed bottom-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-lg ${bgColor} ${color} z-40`} // Position bottom-left
        >
            <Icon className={`w-3.5 h-3.5 mr-1.5 ${operatingMode === 'loading' ? 'animate-spin' : ''}`} />
            {text}
        </div>
     );
  }


  return (
    <div className={theme}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors relative pb-16"> {/* Add padding-bottom */}
        <ThemeToggle theme={theme} onThemeChange={setTheme} />
        {renderModeIndicator()} {/* Add mode indicator */}
        {renderAppStatus()} {/* Render loading/error overlays */}

        <div className="container mx-auto py-8 px-4">
          {/* Header Section - Buttons Consolidated */}
          <div className="flex flex-col sm:flex-row items-center justify-end mb-8 gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={handleNewDocument}
                disabled={operatingMode === 'loading' || operatingMode === 'error'}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                New Doc
              </button>
              <button
                onClick={() => setShowDocumentManager(true)}
                 disabled={operatingMode === 'loading' || operatingMode === 'error'}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Save/Open
              </button>
              <button
                onClick={() => setShowFullDocument(true)}
                disabled={operatingMode === 'loading' || operatingMode === 'error'}
                className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                View Full
              </button>
            </div>
          </div>

          {/* Only render grid if not loading/error */}
          {(operatingMode === 'supabase' || operatingMode === 'local') ? (
             <DocumentGrid
              rows={rows}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onUpdateTitle={handleUpdateTitle}
              onUpdateInput={handleUpdateInput}
              onUpdatePrompt={handleUpdatePrompt}
              onUpdateOutput={handleUpdateOutput}
              onToggleExpand={handleToggleExpand}
              onToggleInputExpand={handleToggleInputExpand}
              onUpdateSectionInput={handleUpdateSectionInput}
              onAddSectionInput={handleAddSectionInput}
              onRemoveSectionInput={handleRemoveSectionInput}
              onGenerateText={handleGenerateText}
              // onViewFullDocument prop removed
              onImportDocument={handleImportDocument}
              isGeneratingDisabled={!isAiInitialized}
            />
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {/* Status handled by overlay */}
            </div>
          )}
        </div>

        {/* Modals should only be interactive when not loading/error */}
        {(operatingMode === 'supabase' || operatingMode === 'local') && (
          <>
            <FullDocumentModal
              isOpen={showFullDocument}
              onClose={() => setShowFullDocument(false)}
              rows={rows}
              onUpdateRow={handleUpdateOutput}
              onUpdateAllRows={handleUpdateAllRows}
            />

            <DocumentManageModal
              isOpen={showDocumentManager}
              onClose={() => setShowDocumentManager(false)}
              onSave={handleSaveDocument}
              onOpen={handleOpenDocument}
              onDelete={handleDeleteDocument}
              savedDocuments={savedDocuments} // Pass the current state
              currentDocument={savedDocuments.find(doc => doc.id === currentDocumentId)} // Find current doc in state
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
