import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { Link } from 'react-router-dom';

export const UnauthorizedView: React.FC = () => {
  return (
    <Box sx={{ minHeight: '75vh', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 500, borderRadius: 3, borderTop: '6px solid #E53935' }}>
        <LockIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h4" fontWeight={800} color="#0A2540" sx={{ mb: 1 }}>
          403 - ปฏิเสธสิทธิ์การเข้าถึง (Unauthorized)
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          บทบาทผู้ใช้ของคุณไม่ได้รับอนุญาตให้เข้าถึงหน้าระบบหรือเส้นทางนี้ หากต้องการสิทธิ์เพิ่มเติม กรุณาติดต่อทีม Infection Control หรือ HR
        </Typography>
        <Button component={Link} to="/dashboard" variant="contained" sx={{ backgroundColor: '#0A2540', px: 3, py: 1, fontWeight: 700 }}>
          กลับสู่หน้าหลัก (Back to Home)
        </Button>
      </Paper>
    </Box>
  );
};
