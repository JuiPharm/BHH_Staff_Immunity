import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';

export const OfflineView: React.FC = () => {
  return (
    <Box sx={{ minHeight: '75vh', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 500, borderRadius: 3, borderTop: '6px solid #ED6C02' }}>
        <WifiOffIcon color="warning" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h4" fontWeight={800} color="#0A2540" sx={{ mb: 1 }}>
          ขาดการเชื่อมต่ออินเทอร์เน็ต (You are Offline)
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          แอปพลิเคชัน PWA ทำงานในโหมดออฟไลน์ ข้อมูลบางส่วนอาจไม่ได้รับการอัปเดตจนกว่าจะมีการเชื่อมต่อเครือข่ายใหม่
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ backgroundColor: '#0A2540', px: 3, py: 1, fontWeight: 700 }}>
          ลองเชื่อมต่อใหม่ (Retry Connection)
        </Button>
      </Paper>
    </Box>
  );
};
