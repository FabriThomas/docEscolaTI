// Gerado por packages/tokens/sd.config.mjs a partir de tokens.json. Não edite à mão.
// Tamanhos em pontos (React Native/Expo); cores em hex ou rgba.
export const tokens = {
  "primitive": {
    "color": {
      "navy": {
        "700": "#1A3250",
        "800": "#11233A",
        "900": "#0D1B2A",
        "950": "#070F18"
      },
      "green": {
        "200": "#A8EFC4",
        "500": "#1DDB6A"
      },
      "gray": {
        "500": "#6B7A8D"
      },
      "white": "#FFFFFF",
      "red": {
        "400": "#FF5A5F"
      }
    },
    "space": {
      "0": 0,
      "1": 4,
      "2": 8,
      "3": 12,
      "4": 16,
      "5": 20,
      "6": 24,
      "8": 32,
      "10": 40,
      "12": 48,
      "16": 64
    },
    "radius": {
      "sm": 8,
      "md": 12,
      "lg": 18,
      "full": 999
    },
    "font": {
      "family": {
        "title": "'Space Grotesk', system-ui, sans-serif",
        "body": "'DM Sans', system-ui, sans-serif"
      },
      "size": {
        "11": 11,
        "13": 13,
        "14": 14,
        "15": 15,
        "16": 16,
        "18": 18,
        "20": 20,
        "24": 24
      },
      "weight": {
        "regular": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      }
    }
  },
  "semantic": {
    "color": {
      "bg": {
        "page": "#070F18",
        "app": "#0D1B2A",
        "surface": "#11233A",
        "raised": "#1A3250",
        "field": "rgba(255, 255, 255, 0.03)",
        "field-disabled": "rgba(107, 122, 141, 0.08)",
        "brand": "#1DDB6A",
        "brand-subtle": "rgba(29, 219, 106, 0.05)",
        "brand-soft": "rgba(29, 219, 106, 0.12)",
        "esg-subtle": "rgba(168, 239, 196, 0.08)",
        "esg-soft": "rgba(168, 239, 196, 0.14)",
        "danger-soft": "rgba(255, 90, 95, 0.12)",
        "muted-soft": "rgba(107, 122, 141, 0.16)",
        "overlay": "rgba(7, 15, 24, 0.8)"
      },
      "text": {
        "primary": "#FFFFFF",
        "muted": "rgba(255, 255, 255, 0.6)",
        "placeholder": "rgba(255, 255, 255, 0.55)",
        "brand": "#1DDB6A",
        "esg": "#A8EFC4",
        "danger": "#FF5A5F",
        "on-brand": "#0D1B2A"
      },
      "icon": {
        "muted": "#6B7A8D",
        "primary": "#FFFFFF",
        "brand": "#1DDB6A",
        "esg": "#A8EFC4",
        "danger": "#FF5A5F"
      },
      "border": {
        "default": "#1A3250",
        "control": "#6B7A8D",
        "focus": "#1DDB6A",
        "brand": "#1DDB6A",
        "brand-subtle": "rgba(29, 219, 106, 0.14)",
        "esg-subtle": "rgba(168, 239, 196, 0.2)",
        "danger": "#FF5A5F",
        "danger-subtle": "rgba(255, 90, 95, 0.35)"
      }
    }
  },
  "component": {
    "button": {
      "height": 48,
      "height-small": 36,
      "radius": 12
    },
    "control": {
      "height": 48,
      "touch-target": 44
    },
    "layout": {
      "content-max": 1440,
      "sidebar": 256,
      "topbar": 64,
      "bottom-nav": 72
    }
  }
} as const

export type SteelyTokens = typeof tokens
