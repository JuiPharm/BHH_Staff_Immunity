import React, { useState } from 'react';
import { Card, CardContent, Typography, TextField, Button, Box, Alert, CircularProgress, Chip } from '@mui/material';
import { ShieldAlert } from 'lucide-react';
import { apiService } from '../../services/api';
import { UserSession } from '../../types';
import { bdmsColors } from '../../theme/bdmsTheme';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await apiService.login(staffId, password);
    setLoading(false);

    if (res.success && res.data) {
      onLoginSuccess(res.data);
    } else if (res.error) {
      setError(res.error.message);
    }
  };

  const handleQuickLogin = (quickStaffId: string) => {
    setStaffId(quickStaffId);
    setPassword('password123');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${bdmsColors.navy} 0%, #061729 100%)`,
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 460, width: '100%', borderRadius: 4, p: 2, boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
        <CardContent>
          {/* BDMS Header Logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: bdmsColors.red,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                mb: 1.5,
                boxShadow: '0 4px 20px rgba(229, 57, 53, 0.4)'
              }}
            >
              <ShieldAlert size={36} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
              Staff Immunity & Health Registry
            </Typography>
            <Typography variant="body2" sx={{ color: bdmsColors.textSecondary, mt: 0.5 }}>
              โรงพยาบาลกรุงเทพหาดใหญ่ (Bangkok Hospital Hat Yai)
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="รหัสพนักงาน (StaffID)"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              margin="normal"
              required
              variant="outlined"
              placeholder="เช่น IC8001, HR8002, MD8003, ST8004"
            />
            <TextField
              fullWidth
              label="รหัสผ่าน (Password)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              variant="outlined"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              disabled={loading}
              sx={{ py: 1.4, mt: 2, fontSize: '1rem', fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'เข้าสู่ระบบ (Sign In)'}
            </Button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${bdmsColors.border}` }}>
            <Typography variant="caption" sx={{ color: bdmsColors.textSecondary, fontWeight: 600, display: 'block', mb: 1 }}>
              💡 คลิกเพื่อทดสอบ Login ตามสิทธิ์ต่าง ๆ (Quick Demo Accounts):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="IC (Infection Control)" onClick={() => handleQuickLogin('IC8001')} color="primary" size="small" />
              <Chip label="HR Specialist" onClick={() => handleQuickLogin('HR8002')} color="info" size="small" />
              <Chip label="Physician (แพทย์)" onClick={() => handleQuickLogin('MD8003')} sx={{ bgcolor: '#8E24AA', color: '#FFF' }} size="small" />
              <Chip label="Data Owner (พยาบาล)" onClick={() => handleQuickLogin('ST8004')} color="success" size="small" />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
