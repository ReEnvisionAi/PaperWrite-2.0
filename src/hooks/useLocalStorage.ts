import { useState, useEffect } from 'react';

// Helper function to safely get item from localStorage
function getItem<T>(key: string, initialValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return initialValue;
  }
}

// Helper function to safely set item in localStorage
function setItem<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key “${key}”:`, error);
  }
}


// --- Keep the hook for Theme, but remove the generic useLocalStorage ---
// --- We will handle document data directly in App.tsx ---

// export function useLocalStorage<T>(key: string, initialValue: T) {
//   const [storedValue, setStoredValue] = useState<T>(() => {
//     return getItem(key, initialValue);
//   });

//   useEffect(() => {
//     setItem(key, storedValue);
//   }, [key, storedValue]);

//   return [storedValue, setStoredValue] as const;
// }

// Export helper functions if needed elsewhere, or keep them local to App.tsx
export { getItem, setItem };
