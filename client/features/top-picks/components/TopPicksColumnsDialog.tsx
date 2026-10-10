import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
} from "@mui/material";
import {
  isTopPicksMetricAvailableForWindow,
  TOP_PICKS_COLUMNS,
} from "../lib/topPicksColumns";
import type { TopPicksColumnKey, TopPicksWindow } from "../types";
import { dialogPaperSx, secondaryActionSx } from "./topPicksSx";

type TopPicksColumnsDialogProps = {
  open: boolean;
  visibleKeys: TopPicksColumnKey[];
  window: TopPicksWindow;
  onClose: () => void;
  onVisibleKeysChange: (value: TopPicksColumnKey[]) => void;
};

export function TopPicksColumnsDialog({
  open,
  visibleKeys,
  window,
  onClose,
  onVisibleKeysChange,
}: TopPicksColumnsDialogProps) {
  const availableColumns = TOP_PICKS_COLUMNS.filter((column) =>
    isTopPicksMetricAvailableForWindow(column.key, window),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle
        sx={{
          fontSize: "var(--fit-type-size-panel-title)",
          fontWeight: "var(--fit-type-weight-semibold)",
          lineHeight: "var(--fit-type-leading-heading)",
          borderBottom:
            "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
        }}
      >
        Edit columns
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          borderColor:
            "var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
          color: "var(--fit-color-text-body, #b9c1d0)",
        }}
      >
        <Stack>
          {availableColumns.map((column) => (
            <FormControlLabel
              key={column.key}
              control={
                <Checkbox
                  checked={visibleKeys.includes(column.key)}
                  disabled={
                    visibleKeys.length === 1 && visibleKeys.includes(column.key)
                  }
                  onChange={(_, checked) =>
                    onVisibleKeysChange(
                      checked
                        ? Array.from(new Set([...visibleKeys, column.key]))
                        : visibleKeys.filter((key) => key !== column.key),
                    )
                  }
                  sx={{
                    color: "var(--fit-color-text-muted, #8f98aa)",
                    "&.Mui-checked": {
                      color: "var(--fit-color-accent-strong, #65a0fd)",
                    },
                  }}
                />
              }
              label={column.label}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          borderTop:
            "1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))",
          p: 2,
        }}
      >
        <Button onClick={onClose} sx={secondaryActionSx}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
