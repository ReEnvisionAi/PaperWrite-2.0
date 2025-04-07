import { DocumentRow } from '../types'; // Remove duplicate import if present

export interface DocumentRow {
  id: string;
  title: string; // Added section title
  input: string;
  aiPrompt: {
    wordCount: number;
    tone: string;
    prompt: string;
  };
  output: string;
  isExpanded: boolean;
  isLoading?: boolean;
  error?: string;
  sectionInputs: {
    facts: string[];
    concepts: string[];
    opinions: string[];
    examples: string[];
    other: string[];
  };
  expandedInputs: {
    facts: boolean;
    concepts: boolean;
    opinions: boolean;
    examples: boolean;
    other: boolean;
  };
}

export interface SavedDocument {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  rows: DocumentRow[];
}

export type Theme = 'dark' | 'light';

export type InputCategory = 'facts' | 'concepts' | 'opinions' | 'examples' | 'other';

export interface OpenAIConfig {
  apiKey: string;
}
