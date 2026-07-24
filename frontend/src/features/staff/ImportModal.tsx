import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Alert } from '@mui/material';
import { UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { bdmsColors } from '../../theme/bdmsTheme';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ open, onClose, onImportSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setLoading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      setLoading(false);
      onImportSuccess(json.length);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError('ไม่สามารถอ่านไฟล์ XLSX/CSV ได้ กรุณาตรวจสอบรูปแบบตารางข้อมูล');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: bdmsColors.navy }}>
        📥 นำเข้าข้อมูล Staff Master (Import Excel/CSV)
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: bdmsColors.textSecondary, mb: 2 }}>
          อัปโหลดไฟล์รายชื่อบุคลากร (รองรับ XLSX และ CSV) เพื่ออัปเดต Staff Master ในระบบ
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box
          sx={{
            border: `2px dashed ${bdmsColors.navy}`,
            borderRadius: 3,
            p: 3,
            textAlign: 'center',
            backgroundColor: 'rgba(10, 37, 64, 0.02)',
            cursor: 'pointer'
          }}
          component="label"
        >
          <input type="file" hidden onChange={handleFileChange} accept=".xlsx,.csv" />
          <UploadCloud size={32} color={bdmsColors.navy} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: bdmsColors.navy, mt: 1 }}>
            {selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกไฟล์ (Staff_Master.xlsx)'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          ยกเลิก
        </Button>
        <Button onClick={handleImport} variant="contained" color="primary" disabled={!selectedFile || loading}>
          เริ่มการนำเข้าข้อมูล
        </Button>
      </DialogActions>
    </Dialog>
  );
};
