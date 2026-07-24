import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useNavigate } from 'react-router-dom';
import { apiService, getStoredSession } from '../../services/api';

export const ForceChangePasswordView: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const session = getStoredSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('การยืนยันรหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.changePassword(session?.staffId || '', oldPassword, newPassword);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error?.message || 'การเปลี่ยนรหัสผ่านล้มเหลว');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <Paper sx={{ p: 4, maxWidth: 450, width: '100%', borderRadius: 3, borderTop: '6px solid #E53935' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LockResetIcon color="error" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight={800} color="#0A2540">
            บังคับเปลี่ยนรหัสผ่านครั้งแรก
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            เพื่อความปลอดภัยของข้อมูลสุขภาพระบบโรงพยาบาลกรุงเทพหาดใหญ่ กรุณาตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="รหัสผ่านปัจจุบัน"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="ยืนยันรหัสผ่านใหม่"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ backgroundColor: '#0A2540', py: 1.2, fontWeight: 700 }}
          >
            {loading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'บันทึกรหัสผ่านใหม่'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};
