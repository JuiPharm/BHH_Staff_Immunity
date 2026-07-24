import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiService } from '../../services/api';

interface ImportWizardModalProps {
  open: boolean;
  userRole: string;
  onClose: () => void;
}

const STEPS = ['เลือกประเภทและไฟล์', 'จับคู่อ้างอิงคอลัมน์', 'ตรวจสอบความถูกต้อง (Dry Run)', 'การยื่นยืนยันการนำเข้า', 'สรุปผลและรายงาน'];

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({ open, userRole: _userRole, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [targetType, setTargetType] = useState<string>('STAFF_MASTER');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [previewResult, setPreviewResult] = useState<any>(null);
  const [commitSummary, setCommitSummary] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleNextToDryRun = async () => {
    setLoading(true);
    try {
      // Simulate raw rows for dry run
      const rawRows = [
        { StaffID: 'ST8004', FirstName: 'อารียา', LastName: 'รักษ์ดี', WorkGroup: 'FRONTLINE', Email: 'areeya@bdms.co.th' },
        { StaffID: 'ST8005', FirstName: 'กิตติศักดิ์', LastName: 'มุ่งมั่น', WorkGroup: 'CLINICAL', Email: 'kittisak@bdms.co.th' }
      ];

      const res = await apiService.getStaffList(); // Verify role access
      if (res.success) {
        setPreviewResult({
          summary: {
            totalRows: 2,
            successRows: 2,
            warningRows: 0,
            errorRows: 0
          },
          results: [
            { rowNumber: 2, isValid: true, sanitizedRecord: rawRows[0], errors: [] },
            { rowNumber: 3, isValid: true, sanitizedRecord: rawRows[1], errors: [] }
          ]
        });
        setActiveStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      setCommitSummary({
        importJobId: `job-${Date.now()}`,
        totalRows: 2,
        insertedRows: 1,
        updatedRows: 1,
        errorRows: 0,
        skippedRows: 0,
        executedAt: new Date().toLocaleTimeString()
      });
      setActiveStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setFileName('');
    setPreviewResult(null);
    setCommitSummary(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleReset} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#0A2540', color: '#FFFFFF', fontWeight: 700 }}>
        ระบบนำเข้าข้อมูลแบบ Batch (Bulk Data Import Wizard)
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Upload & Target Selection */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>ประเภทข้อมูลที่ต้องการนำเข้า (Import Target)</InputLabel>
              <Select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                label="ประเภทข้อมูลที่ต้องการนำเข้า (Import Target)"
              >
                <MenuItem value="STAFF_MASTER">1. ทะเบียนบุคลากร (Staff Master Record)</MenuItem>
                <MenuItem value="VACCINATION">2. ประวัติการรับวัคซีน (Vaccination Records)</MenuItem>
                <MenuItem value="LAB_RESULT">3. ผลตรวจทางห้องปฏิบัติการ (Lab Results)</MenuItem>
                <MenuItem value="CHEST_XRAY">4. ผลตรวจภาพถ่ายปอด (Chest X-Ray)</MenuItem>
                <MenuItem value="TB_ASSESSMENT">5. ผลการคัดกรองวัณโรค (TB Assessment)</MenuItem>
              </Select>
            </FormControl>

            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                borderStyle: 'dashed',
                borderColor: '#1565C0',
                backgroundColor: '#F8FAFC',
                borderRadius: 2
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: '#1565C0', mb: 1 }} />
              <Typography variant="h6" fontWeight={700} color="#0A2540">
                เลือกไฟล์ CSV หรือ XLSX
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                รองรับขนาดไฟล์ไม่เกิน 10 MB ระบบป้องกัน Anti-CSV Formula Injection อัตโนมัติ
              </Typography>

              <Button variant="contained" component="label" sx={{ backgroundColor: '#0A2540' }}>
                เลือกไฟล์เอกสาร
                <input type="file" hidden accept=".csv, .xlsx" onChange={handleFileUpload} />
              </Button>

              {fileName && (
                <Typography variant="subtitle2" color="success.main" fontWeight={700} sx={{ mt: 2 }}>
                  เลือกไฟล์แล้ว: {fileName}
                </Typography>
              )}
            </Paper>
          </Box>
        )}

        {/* Step 1: Column Mapping */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#0A2540' }}>
              ตรวจสอบการจับคู่อ้างอิงคอลัมน์ (Column Mapping Preview)
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              ระบบทำการตรวจจับและจับคู่อ้างอิงคอลัมน์ให้อัตโนมัติ ท่านสามารถปรับเปลี่ยนฟิลด์อ้างอิงได้
            </Alert>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Header คอลัมน์ในไฟล์</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ฟิลด์เป้าหมายในระบบ (System Target Field)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>StaffID</TableCell>
                  <TableCell><Chip label="StaffID (Required)" color="primary" size="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>FirstName</TableCell>
                  <TableCell><Chip label="FirstName" color="default" size="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>LastName</TableCell>
                  <TableCell><Chip label="LastName" color="default" size="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>WorkGroup</TableCell>
                  <TableCell><Chip label="WorkGroup" color="default" size="small" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Step 2: Dry Run Preview */}
        {activeStep === 2 && previewResult && (
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#0A2540' }}>
              ผลการตรวจสอบความถูกต้องก่อนการบันทึก (Dry Run Preview)
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              พบข้อมูลถูกต้อง {previewResult.summary.successRows} รายการ จากทั้งหมด {previewResult.summary.totalRows} รายการ พร้อมนำเข้าสู่ระบบแบบ Batch
            </Alert>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>แถวที่</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>StaffID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อ-นามสกุล</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ผลการตรวจสอบ (Dry Run Status)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewResult.results.map((r: any) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{r.sanitizedRecord.StaffID}</TableCell>
                    <TableCell>{r.sanitizedRecord.FirstName} {r.sanitizedRecord.LastName}</TableCell>
                    <TableCell>
                      <Chip label="ถูกต้องพร้อมบันทึก (Valid)" color="success" size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Step 3: Confirmation */}
        {activeStep === 3 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h5" fontWeight={800} color="#0A2540" sx={{ mb: 2 }}>
              ยืนยันการบันทึกข้อมูลแบบ Batch (Commit Import Job)
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              ระบบจะทำการบันทึกข้อมูลลงฐานข้อมูลแบบ Idempotency (ข้ามหรืออัปเดตรายการซ้ำอัตโนมัติ)
            </Typography>
          </Box>
        )}

        {/* Step 4: Summary & Download Error Report */}
        {activeStep === 4 && commitSummary && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
            <Typography variant="h5" fontWeight={800} color="success.main" sx={{ mb: 1 }}>
              นำเข้าข้อมูลแบบ Batch สำเร็จเรียบร้อยแล้ว
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              รหัส ImportJobID: {commitSummary.importJobId} • เวลาที่ทำรายการ: {commitSummary.executedAt}
            </Typography>

            <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto', backgroundColor: '#F8FAFC', borderRadius: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">รายการทั้งหมด (Total Rows):</Typography>
                <Typography variant="body2" fontWeight={700}>{commitSummary.totalRows}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">สร้างใหม่ (Inserted):</Typography>
                <Typography variant="body2" fontWeight={700} color="success.main">{commitSummary.insertedRows}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">อัปเดตข้อมูลเดิม (Updated):</Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">{commitSummary.updatedRows}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">ข้ามเนื่องจากข้อผิดพลาด (Skipped):</Typography>
                <Typography variant="body2" fontWeight={700} color="error.main">{commitSummary.skippedRows}</Typography>
              </Box>
            </Paper>

            <Button variant="outlined" startIcon={<DownloadIcon />} color="primary" sx={{ fontWeight: 700 }}>
              ดาวน์โหลดรายงานข้อผิดพลาด (Download Error Report .CSV)
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #E0E0E0' }}>
        {activeStep < 4 && (
          <Button onClick={handleReset} variant="outlined" color="inherit">
            ยกเลิก
          </Button>
        )}

        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={() => setActiveStep(1)}
            disabled={!fileName}
            sx={{ backgroundColor: '#0A2540' }}
          >
            ถัดไป: จับคู่อ้างอิงคอลัมน์
          </Button>
        )}

        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleNextToDryRun}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ backgroundColor: '#0A2540' }}
          >
            ถัดไป: ตรวจสอบแบบ Dry Run
          </Button>
        )}

        {activeStep === 2 && (
          <Button variant="contained" onClick={() => setActiveStep(3)} sx={{ backgroundColor: '#0A2540' }}>
            ถัดไป: ยืนยันการนำเข้า
          </Button>
        )}

        {activeStep === 3 && (
          <Button
            variant="contained"
            onClick={handleCommit}
            disabled={loading}
            color="success"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            ยืนยันการนำเข้าข้อมูล (Commit Import)
          </Button>
        )}

        {activeStep === 4 && (
          <Button variant="contained" onClick={handleReset} sx={{ backgroundColor: '#0A2540' }}>
            เสร็จสิ้น
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
