import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';

export interface GraphSettings {
  graphType: string;
  stockSymbol: string;
  graphColor: string;
}

interface GraphSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (settings: GraphSettings) => void;
}

const GraphSettingsModal: React.FC<GraphSettingsModalProps> = ({ open, onClose, onApply }) => {
  const [graphType, setGraphType] = useState<string>('OHLC');
  const [stockSymbol, setStockSymbol] = useState<string>('');
  const [graphColor, setGraphColor] = useState<string>('#fc03d7');

  const handleApply = () => {
    onApply({ graphType, stockSymbol, graphColor });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Graph Settings</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel id="graph-type-label">Graph Type</InputLabel>
          <Select
            labelId="graph-type-label"
            value={graphType}
            label="Graph Type"
            onChange={(e) => setGraphType(e.target.value as string)}
          >
            <MenuItem value="OHLC">OHLC</MenuItem>
            <MenuItem value="Line">Line</MenuItem>
            <MenuItem value="Bar">Bar</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel id="stock-symbol-label">Stock</InputLabel>
          <Select
            labelId="stock-symbol-label"
            value={stockSymbol}
            label="Stock"
            onChange={(e) => setStockSymbol(e.target.value as string)}
          >
            <MenuItem value="AAPL">AAPL</MenuItem>
            <MenuItem value="GOOGL">GOOGL</MenuItem>
            <MenuItem value="AMZN">AMZN</MenuItem>
            <MenuItem value="MSFT">MSFT</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Graph Color"
            type="color"
            value={graphColor}
            onChange={(e) => setGraphColor(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GraphSettingsModal;
