/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Ensure prose styles are available
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            // Base styles (light mode)
            color: theme('colors.gray.700'),
            a: {
              color: theme('colors.blue.600'),
              '&:hover': {
                color: theme('colors.blue.800'),
              },
            },
            // Add other prose elements as needed
          },
        },
        invert: { // Dark mode styles for prose-invert
          css: {
            color: theme('colors.gray.300'), // Default inverted text color
            a: {
              color: theme('colors.blue.400'),
              '&:hover': {
                color: theme('colors.blue.300'),
              },
            },
            strong: { color: theme('colors.gray.100') },
            h1: { color: theme('colors.gray.100') },
            h2: { color: theme('colors.gray.100') },
            h3: { color: theme('colors.gray.100') },
            h4: { color: theme('colors.gray.100') },
            blockquote: { color: theme('colors.gray.400'), borderLeftColor: theme('colors.gray.700') },
            code: { color: theme('colors.gray.300'), backgroundColor: theme('colors.gray.800') },
            pre: { color: theme('colors.gray.300'), backgroundColor: theme('colors.gray.800') },
            // Add other inverted prose elements
          },
        },
      }),
      colors: {
        gray: {
          850: '#1f2937', // Keep custom color if used elsewhere
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Add typography plugin
  ],
};
