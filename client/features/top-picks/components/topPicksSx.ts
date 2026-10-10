export const secondaryActionSx = {
  minHeight: 40,
  bgcolor: "var(--fit-color-field, #18181b)",
  color: "#dce4ff",
  border: "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
  borderRadius: "0.625rem",
  px: 2,
  py: 1,
  textTransform: "none",
  fontWeight: "var(--fit-type-weight-semibold)",
  boxShadow: "none",
  "&:hover": {
    bgcolor: "var(--fit-color-surface-soft, #111114)",
    borderColor:
      "var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))",
    boxShadow: "none",
  },
  "&:focus-visible": {
    outline: "2px solid var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))",
    outlineOffset: 2,
  },
};

export const darkControlSx = {
  bgcolor: "var(--fit-color-field, #18181b)",
  color: "#fff",
  fontSize: "var(--fit-type-size-body-sm)",
  borderRadius: "0.625rem",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--fit-color-border-control, #202230)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor:
      "var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))",
  },
  "& .MuiSelect-icon": {
    color: "var(--fit-color-text-muted, #8f98aa)",
  },
};

export const darkMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: "var(--fit-color-surface, #09090b)",
      color: "#fff",
      border:
        "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
      borderRadius: "0.625rem",
      "& .MuiMenuItem-root.Mui-selected": {
        bgcolor: "var(--fit-color-brand-chip, rgba(123, 140, 255, 0.1))",
      },
      "& .MuiMenuItem-root:hover": {
        bgcolor: "var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))",
      },
    },
  },
};

export const dialogPaperSx = {
  bgcolor: "var(--fit-color-surface, #09090b)",
  color: "#fff",
  fontFamily: "var(--fit-font-family)",
  border: "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
  borderRadius: "0.75rem",
  backgroundImage: "none",
  boxShadow: "0 1.8rem 5rem rgba(0, 0, 0, 0.62)",
};
