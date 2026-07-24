import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { apiService } from '../../services/api';
import { bdmsColors } from '../../theme/bdmsTheme';

interface PasswordChangeModalProps {
  open: boolean;
  staffId: string;
  isMandatory?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  open,
  staffId,
  isMandatory = false,
  onClose,
  onSuccess
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (newPassword.length < 8) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await apiService.changePassword(staffId, oldPassword, newPassword);
    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else if (res.error) {
      setError(res.error.message);
    }
  };

  return (
    <Dialog open={open} onClose={isMandatory ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: bdmsColors.navy }}>
        {isMandatory ? '🔒 บังคับเปลี่ยนรหัสผ่านครั้งแรก (Mandatory Change)' : 'เปลี่ยนรหัสผ่าน (Change Password)'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {isMandatory && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              เพื่อความปลอดภัยของข้อมูลสุขภาพ กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งานระบบ
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="รหัสผ่านปัจจุบัน"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            margin="dense"
            required
          />
          <TextField
            fullWidth
            label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="dense"
            required
          />
          <TextField
            fullWidth
            label="ยืนยันรหัสผ่านใหม่"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="dense"
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          {!isMandatory && (
            <Button onClick={onClose} color="inherit">
              ยกเลิก
            </Button>
          )}
          <Button type="submit" variant="contained" color="secondary" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'บันทึกรหัสผ่านใหม่'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
