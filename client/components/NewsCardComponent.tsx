import React, { useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

export interface NewsCardComponentProps {
  index: number;
  title: string;
  height?: number | string;
}

const NewsCardComponent: React.FC<NewsCardComponentProps> = ({
  height = 300,
  title,    
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenToggle = () => {
    setIsFullscreen(prev => !prev);
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top:      isFullscreen ? 0 : 'unset',
        left:     isFullscreen ? 0 : 'unset',
        width:    isFullscreen ? '100vw' : '100%',
        height:   isFullscreen ? '100vh' : height,
        bgcolor:  '#111',
        border:   '1px solid #555',
        p:        '1rem',
        overflow: 'hidden',
        zIndex:   isFullscreen ? 1000 : 'unset',
      }}
    >
        <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
            {title}
        </Typography>

      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" onClick={handleFullscreenToggle}>
          {isFullscreen ? '⤡' : '⤢'}
        </Button>
        <Button variant="contained" size="small" >
          ⚙︎
        </Button>
      </Box>
    </Box>
  );
};

export default NewsCardComponent;
