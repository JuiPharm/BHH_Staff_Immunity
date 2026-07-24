import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Alert,
  Paper
} from '@mui/material';
import { apiService } from '../../services/api';
import { WorkReadinessStatus } from '../../types';
import { bdmsColors } from '../../theme/bdmsTheme';

export const PhysicianView: React.FC = () => {
  const [targetStaffId, setTargetStaffId] = useState('ST8005');
  const [workReadiness, setWorkReadiness] = useState<WorkReadinessStatus>('CONDITIONALLY_CLEARED');
  const [medicalOverride, setMedicalOverride] = useState(true);
  const [overrideReason, setOverrideReason] = useState('รอผลตรวจ Anti-HBs Titre แต่ฉีดวัคซีนครบแล้ว ให้ปฏิบัติงานได้แบบมีเงื่อนไข');
  const [clinicalNotes, setClinicalNotes] = useState('ติดตามผล Anti-HBs ภายใน 30 วัน');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);

    const res = await apiService.addPhysicianAssessment({
      staffId: targetStaffId,
      workReadinessStatus: workReadiness,
      medicalOverride,
      overrideReason,
      clinicalNotes
    });

    setLoading(false);
    if (res.success) {
      setSuccessMsg(`บันทึก Physician Assessment และ Medical Override สำหรับบุคลากร ${targetStaffId} สำเร็จ`);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
          การประเมินโดยแพทย์อาชีวอนามัย (Physician Assessment & Medical Override)
        </Typography>
        <Typography variant="body2" sx={{ color: bdmsColors.textSecondary }}>
          สำหรับแพทย์ผู้เชี่ยวชาญในการพิจารณาข้อยกเว้นทางการแพทย์ (Medical Exemption) หรือการอนุมัติสิทธิ์การทำงานพิเศษ
        </Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMsg}</Alert>}

      <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: bdmsColors.navy, mb: 2 }}>
            แบบฟอร์มประเมินทางการแพทย์ (Medical Review Form)
          </Typography>

          <TextField
            fullWidth
            label="รหัสพนักงาน (StaffID)"
            value={targetStaffId}
            onChange={(e) => setTargetStaffId(e.target.value)}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>ผลการประเมินความพร้อม (Work Readiness Status)</InputLabel>
            <Select value={workReadiness} label="ผลการประเมินความพร้อม (Work Readiness Status)" onChange={(e) => setWorkReadiness(e.target.value as WorkReadinessStatus)}>
              <MenuItem value="CLEARED">CLEARED (อนุมัติให้ปฏิบัติงานปกติ)</MenuItem>
              <MenuItem value="CONDITIONALLY_CLEARED">CONDITIONALLY CLEARED (อนุมัติแบบมีเงื่อนไข)</MenuItem>
              <MenuItem value="NOT_CLEARED">NOT CLEARED (ไม่อนุมัติให้ปฏิบัติงาน)</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ my: 2, p: 2, bgcolor: 'rgba(229, 57, 53, 0.04)', borderRadius: 2, border: `1px solid rgba(229, 57, 53, 0.2)` }}>
            <FormControlLabel
              control={<Switch checked={medicalOverride} onChange={(e) => setMedicalOverride(e.target.checked)} color="secondary" />}
              label={
                <Typography variant="body1" sx={{ fontWeight: 700, color: bdmsColors.red }}>
                  เปิดใช้งาน Medical Override (สิทธิ์การอนุมัติข้ามเกณฑ์ปกติโดยแพทย์)
                </Typography>
              }
            />
          </Box>

          {medicalOverride && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="เหตุผลการทำ Medical Override (Override Clinical Justification)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              margin="normal"
              required
            />
          )}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="บันทึกทางคลินิกเพิ่มเติม (Clinical Notes)"
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            margin="normal"
          />

          <Button type="submit" variant="contained" color="secondary" size="large" disabled={loading} sx={{ mt: 3, fontWeight: 700 }}>
            {loading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกผลการประเมินโดยแพทย์'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};
