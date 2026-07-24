import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Alert, CircularProgress, LinearProgress } from '@mui/material';
import { UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadStaffMasterTemplate, downloadVaccinationTemplate, downloadLabScreeningTemplate } from '../../utils/templateGenerator';
import { Download } from 'lucide-react';
import { bdmsColors } from '../../theme/bdmsTheme';
import { apiService } from '../../services/api';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ open, onClose, onImportSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
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
    setProgress(0);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      for (let i = 0; i < json.length; i++) {
        // Prepare row data matching backend expected fields
        const row = json[i];
        const res = await apiService.createStaff(row);
        if (res.success) {
          successCount++;
        } else {
          console.error('Failed to import row', row, res.error);
        }
        setProgress(Math.round(((i + 1) / json.length) * 100));
      }

      setLoading(false);
      onImportSuccess(successCount);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError('ไม่สามารถอ่านไฟล์ XLSX/CSV ได้ หรือเกิดข้อผิดพลาดในการส่งข้อมูล');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: bdmsColors.navy }}>
        📥 นำเข้าข้อมูลและดาวน์โหลด Template (Import & Templates)
      </DialogTitle>
      <DialogContent>
        {/* Template Download Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: `1px solid ${bdmsColors.border}` }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: bdmsColors.navy, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download size={16} /> ดาวน์โหลดแม่แบบไฟล์ Excel (Download Import Templates):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button size="small" variant="outlined" color="primary" onClick={downloadStaffMasterTemplate}>
              📄 Template Staff Master
            </Button>
            <Button size="small" variant="outlined" color="secondary" onClick={downloadVaccinationTemplate}>
              💉 Template ประวัติวัคซีน
            </Button>
            <Button size="small" variant="outlined" color="info" onClick={downloadLabScreeningTemplate}>
              🧪 Template ผลแล็บ/ภูมิคุ้มกัน
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ color: bdmsColors.textSecondary, mb: 2 }}>
          เลือกอัปโหลดไฟล์ Excel / CSV ที่กรอกข้อมูลตามรูปแบบด้านบนเพื่อนำเข้าสู่ระบบ:
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
          {loading ? (
            <Box sx={{ mt: 2 }}>
              <CircularProgress size={40} sx={{ color: bdmsColors.navy, mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: bdmsColors.navy }}>
                กำลังนำเข้าข้อมูล... {progress}%
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 8, borderRadius: 4 }} />
            </Box>
          ) : (
            <>
              <input type="file" hidden onChange={handleFileChange} accept=".xlsx,.csv" />
              <UploadCloud size={32} color={bdmsColors.navy} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: bdmsColors.navy, mt: 1 }}>
                {selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกไฟล์ (Staff_Master.xlsx)'}
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          ยกเลิก
        </Button>
        <Button onClick={handleImport} variant="contained" color="primary" disabled={!selectedFile || loading}>
          {loading ? 'กำลังทำงาน...' : 'เริ่มการนำเข้าข้อมูล'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
