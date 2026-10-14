import { createTheme } from "@mui/material/styles";
import { fitColors } from "./themeTokens";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: fitColors.accent, contrastText: fitColors.actionInk },
    secondary: { main: fitColors.info },
    background: { default: fitColors.page, paper: fitColors.surface },
    text: { primary: fitColors.text, secondary: fitColors.muted },
    success: { main: fitColors.success },
    warning: { main: fitColors.warning },
    error: { main: fitColors.danger },
    info: { main: fitColors.info },
    divider: fitColors.subtleBorder,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--fit-font-family)",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontFamily: "var(--fit-font-display)",
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: "var(--fit-type-leading-heading)",
    },
    h2: {
      fontFamily: "var(--fit-font-display)",
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
    MuiButton: {
      styleOverrides: {
        root: { boxShadow: "none", minHeight: 40 },
        containedPrimary: ({ ownerState }) =>
          ownerState.disabled
            ? {}
            : {
                backgroundColor: fitColors.action,
                color: fitColors.onAction,
                "&:hover": { backgroundColor: fitColors.actionHover },
              },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiOutlinedInput: {
      styleOverrides: { root: { backgroundColor: fitColors.field } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { border: `1px solid ${fitColors.subtleBorder}` },
      },
    },
  },
});
