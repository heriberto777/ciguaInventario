module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        sidebar: 'var(--bg-sidebar)',
        card: 'var(--bg-card)',
        input: 'var(--bg-input)',
        hover: 'var(--bg-hover)',
        active: 'var(--bg-active)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        'sidebar-text': 'var(--text-sidebar)',
        'sidebar-active': 'var(--text-sidebar-active)',
        accent: {
          primary: 'var(--accent-primary)',
          'primary-dark': 'var(--accent-primary-dark)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
          secondary: 'var(--accent-secondary)',
          'secondary-dark': 'var(--accent-secondary-dark)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          dark: 'var(--color-success-dark)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          dark: 'var(--color-warning-dark)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          dark: 'var(--color-danger-dark)',
        },
        info: 'var(--color-info)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
};
