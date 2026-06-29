import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
  },
  typography: {
    fontFamily: "var(--fit-font-family)",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: "var(--fit-type-leading-heading)",
    },
    h2: {
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: "var(--fit-type-leading-heading)",
    },
    h3: {
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: "var(--fit-type-leading-heading)",
    },
    body1: {
      lineHeight: "var(--fit-type-leading-body)",
    },
    body2: {
      lineHeight: "var(--fit-type-leading-body)",
    },
    button: {
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: "var(--fit-type-leading-control)",
      textTransform: "none",
    },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          letterSpacing: 0,
        },
      },
    },
  },
});
