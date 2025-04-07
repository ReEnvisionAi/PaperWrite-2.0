import React from 'react';
import { EditorProvider, FloatingMenu, BubbleMenu, useCurrentEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline'; // Import Underline extension
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Heading2, Quote, Code
} from 'lucide-react';

// Define the props for the editor component
interface RichTextEditorProps {
  content: string;
  onChange: (htmlContent: string) => void;
  editable?: boolean;
}

const MenuBar = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  const menuItems = [
    { action: () => editor.chain().focus().toggleBold().run(), icon: Bold, isActive: editor.isActive('bold'), title: 'Bold' },
    { action: () => editor.chain().focus().toggleItalic().run(), icon: Italic, isActive: editor.isActive('italic'), title: 'Italic' },
    { action: () => editor.chain().focus().toggleUnderline().run(), icon: UnderlineIcon, isActive: editor.isActive('underline'), title: 'Underline' }, // Use UnderlineIcon
    { action: () => editor.chain().focus().toggleStrike().run(), icon: Strikethrough, isActive: editor.isActive('strike'), title: 'Strikethrough' },
    { action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: Heading2, isActive: editor.isActive('heading', { level: 2 }), title: 'Heading 2' },
    { action: () => editor.chain().focus().toggleBulletList().run(), icon: List, isActive: editor.isActive('bulletList'), title: 'Bullet List' },
    { action: () => editor.chain().focus().toggleOrderedList().run(), icon: ListOrdered, isActive: editor.isActive('orderedList'), title: 'Ordered List' },
    { action: () => editor.chain().focus().toggleBlockquote().run(), icon: Quote, isActive: editor.isActive('blockquote'), title: 'Blockquote' },
    { action: () => editor.chain().focus().toggleCodeBlock().run(), icon: Code, isActive: editor.isActive('codeBlock'), title: 'Code Block' },
  ];

  return (
    <div className="border border-gray-600 rounded-t-lg p-2 flex flex-wrap items-center gap-1 bg-gray-800 print:hidden"> {/* Hide toolbar on print */}
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={item.action}
          className={`p-2 rounded ${item.isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          title={item.title}
          disabled={!editor.isEditable}
        >
          <item.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

// Define the editor configuration
const extensions = [
  StarterKit.configure({
    // Configure extensions as needed
    heading: {
      levels: [1, 2, 3],
    },
    // Ensure default paragraph styling doesn't interfere
    // paragraph: {
    //   HTMLAttributes: {
    //     class: 'text-inherit', // Try inheriting color
    //   },
    // },
  }),
  // Add Underline support explicitly
  Underline,
];

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  return (
    <div className="rich-text-editor border border-gray-600 rounded-b-lg bg-gray-850 dark:bg-gray-850 print:border-none"> {/* Ensure background in dark mode */}
      <EditorProvider
        slotBefore={<MenuBar />}
        extensions={extensions}
        content={content}
        onUpdate={({ editor }) => {
          onChange(editor.getHTML());
        }}
        editable={editable}
        editorProps={{
          attributes: {
            // Apply Tailwind prose classes AND explicit text color for dark mode
            class: 'prose prose-invert max-w-none p-4 focus:outline-none min-h-[150px] custom-scrollbar text-gray-900 dark:text-gray-100 print:text-black print:p-0 print:min-h-0',
          },
        }}
      >
        {/* Optional: Add BubbleMenu or FloatingMenu for contextual actions */}
        {/* <BubbleMenu>...</BubbleMenu> */}
        {/* <FloatingMenu>...</FloatingMenu> */}
      </EditorProvider>
    </div>
  );
}

// Add basic styles for TipTap editor content if needed (Tailwind Prose helps a lot)
// You might need to adjust prose styles or add specific CSS for elements like code blocks
const editorStyles = `
.tiptap {
  outline: none;
}
/* Ensure placeholder is visible in dark mode */
.dark .tiptap p.is-editor-empty:first-child::before {
  color: #4b5563; /* gray-600 */
}
.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af; /* gray-400 */
  pointer-events: none;
  height: 0;
}

/* Prose handles most of these, but keep as fallback if needed */
/*
.tiptap blockquote {
  border-left-color: #4b5563;
  margin-left: 1rem;
  padding-left: 1rem;
}
.tiptap pre {
  background: #1f2937;
  color: #d1d5db;
  font-family: monospace;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}
.tiptap code {
  background-color: rgba(156, 163, 175, 0.2);
  border-radius: 0.25rem;
  padding: 0.1rem 0.3rem;
  font-size: 0.9em;
}
*/

/* Ensure editor itself has a background in dark mode */
.dark .rich-text-editor .tiptap {
    background-color: #1f2937; /* Match gray-850 or similar */
}
.rich-text-editor .tiptap {
    background-color: white;
}

/* Print-specific overrides for editor area */
@media print {
  .rich-text-editor .tiptap {
    background-color: white !important;
    color: black !important;
    border: none !important;
    padding: 0 !important;
    min-height: auto !important;
  }
  .rich-text-editor .tiptap * {
     color: black !important; /* Force all nested elements black */
     background-color: transparent !important;
  }
}
`;

// Inject styles into the head (consider a more robust CSS-in-JS or separate CSS file)
// Check if style already exists to avoid duplicates during HMR
let styleSheet = document.getElementById('tiptap-custom-styles');
if (!styleSheet) {
  styleSheet = document.createElement("style");
  styleSheet.id = 'tiptap-custom-styles';
  styleSheet.type = "text/css";
  styleSheet.innerText = editorStyles;
  document.head.appendChild(styleSheet);
}
