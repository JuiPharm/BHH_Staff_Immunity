import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Alert, CircularProgress, Typography, Box } from '@mui/material';
import { UploadCloud } from 'lucide-react';
import { HealthCategory } from '../../types';
import { apiService } from '../../services/api';
import { bdmsColors } from '../../theme/bdmsTheme';

interface UploadModalProps {
  open: boolean;
  staffId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ open, staffId, onClose, onSuccess }) => {
  const [category, setCategory] = useState<HealthCategory>('INFLUENZA');
  const [administeredDate, setAdministeredDate] = useState('');
  const [resultOrStatus, setResultOrStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedExtensions = ['pdf', 'xlsx', 'csv', 'jpg', 'jpeg', 'png'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedExtensions.includes(ext)) {
        setError(`อนุญาตเฉพาะไฟล์นามสกุล ${allowedExtensions.join(', ')} เท่านั้น`);
        setSelectedFile(null);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('ขนาดไฟล์ต้องไม่เกิน 10 MB');
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await apiService.createHealthRecord(
      {
        staffId,
        category,
        recordType: category === 'CXR' || category === 'TST' ? 'LAB_TEST' : 'VACCINE',
        resultOrStatus: resultOrStatus || 'COMPLETED',
        administeredOrTestDate: administeredDate || new Date().toISOString().split('T')[0]
      },
      selectedFile || undefined
    );

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else if (res.error) {
      setError(res.error.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: bdmsColors.navy }}>
        📤 อัปโหลดหลักฐานวัคซีน/ผลตรวจสุขภาพ (Upload Certificate)
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            ไฟล์ที่อัปโหลดจะถูกเปลี่ยนชื่อเป็น UUID อัตโนมัติเพื่อความปลอดภัยของข้อมูล และส่งต่อให้ทีม IC ยืนยันข้อมูลก่อนผลมีผลบังคับใช้
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            select
            fullWidth
            label="ประเภทรายการสุขภาพ (Category)"
            value={category}
            onChange={(e) => setCategory(e.target.value as HealthCategory)}
            margin="normal"
            required
          >
            <MenuItem value="HEPATITIS_B">Hepatitis B Vaccination</MenuItem>
            <MenuItem value="ANTI_HBS">Anti-HBs Lab Titre</MenuItem>
            <MenuItem value="MMR">MMR Vaccination</MenuItem>
            <MenuItem value="MEASLES_IGG">Measles IgG Lab</MenuItem>
            <MenuItem value="VARICELLA">Varicella Vaccination</MenuItem>
            <MenuItem value="VARICELLA_IGG">Varicella IgG Lab</MenuItem>
            <MenuItem value="TDAP">Tdap/Td Vaccination</MenuItem>
            <MenuItem value="INFLUENZA">Influenza Vaccination</MenuItem>
            <MenuItem value="CXR">Chest X-Ray (CXR)</MenuItem>
            <MenuItem value="TST">TST / IGRA Screening</MenuItem>
            <MenuItem value="LTBI">LTBI Treatment</MenuItem>
          </TextField>

          <TextField
            fullWidth
            type="date"
            label="วันที่รับบริการ/ตรวจสุขภาพ"
            value={administeredDate}
            onChange={(e) => setAdministeredDate(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            fullWidth
            label="รายละเอียด/สถานะ (เช่น เข็มที่ 1, ผลเป็นบวก, ปกติ)"
            value={resultOrStatus}
            onChange={(e) => setResultOrStatus(e.target.value)}
            margin="normal"
            placeholder="เช่น เข็มที่ 2 ครบถ้วน"
          />

          <Box
            sx={{
              border: `2px dashed ${bdmsColors.navy}`,
              borderRadius: 3,
              p: 3,
              textAlign: 'center',
              mt: 2,
              backgroundColor: 'rgba(10, 37, 64, 0.02)',
              cursor: 'pointer'
            }}
            component="label"
          >
            <input type="file" hidden onChange={handleFileChange} accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png" />
            <UploadCloud size={32} color={bdmsColors.navy} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: bdmsColors.navy, mt: 1 }}>
              {selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกไฟล์แนบ (PDF, JPG, PNG, XLSX)'}
            </Typography>
            <Typography variant="caption" sx={{ color: bdmsColors.textSecondary }}>
              จำกัดขนาดไฟล์ไม่เกิน 10 MB
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" color="secondary" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'ส่งข้อมูลเพื่อรอการตรวจสอบ'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
