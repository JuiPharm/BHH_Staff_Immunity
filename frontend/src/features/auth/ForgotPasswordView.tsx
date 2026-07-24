import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import LockQuestionIcon from '@mui/icons-material/HelpOutline';
import { Link } from 'react-router-dom';

export const ForgotPasswordView: React.FC = () => {
  const [staffId, setStaffId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <Paper sx={{ p: 4, maxWidth: 450, width: '100%', borderRadius: 3, borderTop: '6px solid #0A2540' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LockQuestionIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight={800} color="#0A2540">
            ลืมรหัสผ่าน (Forgot Password)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            กรุณาระบุรหัสพนักงาน (StaffID) เพื่อสร้าง One-Time Reset Token
          </Typography>
        </Box>

        {submitted ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            ระบบได้ทำการสร้าง One-Time Reset Token เรียบร้อยแล้ว กรุณาติดต่อแผนก IT หรือ HR เพื่อรับรหัสผ่านชั่วคราว
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="รหัสพนักงาน (StaffID)"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value.toUpperCase())}
              required
              sx={{ mb: 3 }}
            />
            <Button fullWidth type="submit" variant="contained" sx={{ backgroundColor: '#0A2540', py: 1.2, fontWeight: 700 }}>
              ขอรับรหัสผ่านชั่วคราว
            </Button>
          </form>
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button component={Link} to="/login" variant="text" size="small">
            กลับสู่หน้าเข้าสู่ระบบ (Back to Login)
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
