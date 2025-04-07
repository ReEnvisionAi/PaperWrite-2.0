import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ApiKeyModalProps {
  onSubmit: (apiKey: string) => void;
  isOpen: boolean;
}

export function ApiKeyModal({ onSubmit, isOpen }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Enter OpenAI API Key
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your API key will be stored locally and used only for generating text.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full p-2 border rounded mb-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          onClick={() => onSubmit(apiKey)}
          className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700"
        >
          Save API Key
        </button>
      </div>
    </div>
  );
}
