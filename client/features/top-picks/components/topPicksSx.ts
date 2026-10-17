export const windowToggleSx = {
  bgcolor: "var(--fit-color-field)",
  border: "1px solid var(--fit-color-border-control)",
  borderRadius: "var(--fit-radius-control)",
  "& .MuiToggleButton-root": {
    minHeight: 40,
    color: "var(--fit-color-text-body)",
    border: 0,
    px: 1.75,
    fontSize: "0.875rem",
    textTransform: "none",
    "&:focus-visible": {
      outline: "2px solid var(--fit-color-focus-ring)",
      outlineOffset: -3,
    },
  },
  "& .MuiToggleButton-root.Mui-selected": {
    bgcolor: "var(--fit-color-accent-soft)",
    color: "var(--fit-color-accent)",
  },
};

export const secondaryActionSx = {
  minHeight: 40,
  bgcolor: "var(--fit-color-field)",
  color: "var(--fit-color-text-body)",
  border: "1px solid var(--fit-color-border-subtle)",
  borderRadius: "var(--fit-radius-control)",
  px: 2,
  py: 1,
  textTransform: "none",
  fontWeight: "var(--fit-type-weight-semibold)",
  fontSize: "0.875rem",
  boxShadow: "none",
  "&:hover": {
    bgcolor: "var(--fit-color-surface-soft)",
    borderColor: "var(--fit-color-brand-border-hover)",
    boxShadow: "none",
  },
  "&:focus-visible": {
    outline: "2px solid var(--fit-color-focus-ring)",
    outlineOffset: 2,
  },
};

export const darkControlSx = {
  bgcolor: "var(--fit-color-field)",
  color: "var(--fit-color-text-strong)",
  fontSize: "var(--fit-type-size-body-sm)",
  borderRadius: "var(--fit-radius-control)",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--fit-color-border-control)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--fit-color-brand-border-hover)",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--fit-color-focus-ring)",
  },
  "& .MuiSelect-icon": {
    color: "var(--fit-color-text-muted)",
  },
};

export const darkMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: "var(--fit-color-surface)",
      color: "var(--fit-color-text-strong)",
      border: "1px solid var(--fit-color-border-subtle)",
      borderRadius: "var(--fit-radius-control)",
      "& .MuiMenuItem-root.Mui-selected": {
        bgcolor: "var(--fit-color-brand-chip)",
      },
      "& .MuiMenuItem-root:hover": {
        bgcolor: "var(--fit-color-brand-fill-hover)",
      },
    },
  },
};

export const dialogPaperSx = {
  bgcolor: "var(--fit-color-surface)",
  color: "var(--fit-color-text-strong)",
  fontFamily: "var(--fit-font-family)",
  border: "1px solid var(--fit-color-border-subtle)",
  borderRadius: "var(--fit-radius-panel)",
  backgroundImage: "none",
  boxShadow: "0 1.8rem 5rem rgba(0, 0, 0, 0.62)",
};
