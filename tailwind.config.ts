import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "kpi":            ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "screen-title":   ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        "section-header": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "body":           ["14px", { lineHeight: "1.5" }],
        "table":          ["13px", { lineHeight: "1.4" }],
        "table-sm":       ["12px", { lineHeight: "1.4" }],
        "caption":        ["11px", { lineHeight: "1.4" }],
        "table-header":   ["10px", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.05em" }],
      },
      colors: {
        /* Primary */
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
          foreground: "#ffffff",
        },
        /* Surfaces */
        surface: {
          "0": "var(--color-surface-0)",
          "1": "var(--color-surface-1)",
          "2": "var(--color-surface-2)",
          "3": "var(--color-surface-3)",
        },
        /* Text hierarchy */
        text: {
          "1": "var(--color-text-1)",
          "2": "var(--color-text-2)",
          "3": "var(--color-text-3)",
        },
        /* Status tonal */
        success: {
          DEFAULT: "var(--color-success-text)",
          bg: "var(--color-success-bg)",
        },
        warning: {
          DEFAULT: "var(--color-warning-text)",
          bg: "var(--color-warning-bg)",
        },
        danger: {
          DEFAULT: "var(--color-danger-text)",
          bg: "var(--color-danger-bg)",
        },
        info: {
          DEFAULT: "var(--color-info-text)",
          bg: "var(--color-info-bg)",
        },
        /* Shadcn compat aliases */
        background: "var(--color-surface-0)",
        foreground: "var(--color-text-1)",
        border: "var(--color-surface-3)",
        input: "var(--color-surface-3)",
        ring: "var(--color-primary)",
        card: {
          DEFAULT: "var(--color-surface-1)",
          foreground: "var(--color-text-1)",
        },
        popover: {
          DEFAULT: "var(--color-surface-2)",
          foreground: "var(--color-text-1)",
        },
        secondary: {
          DEFAULT: "var(--color-surface-1)",
          foreground: "var(--color-primary)",
        },
        muted: {
          DEFAULT: "var(--color-surface-1)",
          foreground: "var(--color-text-2)",
        },
        accent: {
          DEFAULT: "var(--color-surface-3)",
          foreground: "var(--color-text-1)",
        },
        destructive: {
          DEFAULT: "var(--color-danger-text)",
          foreground: "#ffffff",
        },
        sidebar: {
          DEFAULT: "var(--color-surface-0)",
          foreground: "var(--color-text-2)",
          primary: "var(--color-primary)",
          "primary-foreground": "#ffffff",
          accent: "var(--color-surface-3)",
          "accent-foreground": "var(--color-text-1)",
          border: "var(--color-surface-3)",
          ring: "var(--color-primary)",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        card: "var(--radius-lg)",
        button: "var(--radius-md)",
        panel: "var(--radius-xl)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "slide-in-right":  { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "slide-down":      { from: { transform: "translateY(-100%)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        "fade-in":         { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in":        { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        "slide-in-right":  "slide-in-right 0.3s ease-out",
        "slide-down":      "slide-down 0.2s ease-out",
        "fade-in":         "fade-in 0.3s ease-out",
        "scale-in":        "scale-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
