import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Tokens extraídos do MANUAL-IDENTIDADE-VISUAL.md.
 * Cores nomeadas conforme a marca (navy / amber) e mantidas como
 * variáveis CSS para permitir temas e o sistema shadcn/ui.
 */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Marca
        navy: {
          DEFAULT: "#1a365d",
          dark: "#0f2744",
          mid: "#2d4a6f",
        },
        amber: {
          DEFAULT: "#f5a623",
          dark: "#e09112",
          light: "#ffc857",
        },
        success: "#10b981",
        whatsapp: "#25d366",

        // shadcn tokens (mapeados para a marca via CSS vars em globals.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["Open Sans", "system-ui", "sans-serif"],
        display: ["Montserrat", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px -1px rgba(0,0,0,0.1)",
        lg: "0 10px 15px -3px rgba(0,0,0,0.1)",
        xl: "0 20px 25px -5px rgba(0,0,0,0.1)",
        glow: "0 0 30px rgba(245,166,35,0.4)",
        "primary-glow": "0 0 40px rgba(26,54,93,0.3)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #1a365d 0%, #2d4a6f 100%)",
        "gradient-secondary": "linear-gradient(135deg, #f5a623 0%, #e09112 100%)",
        "gradient-hero":
          "linear-gradient(135deg, #0f2744 0%, #1a365d 50%, #2d4a6f 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
