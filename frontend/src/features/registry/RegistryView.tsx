import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import { Plus, CheckCircle, XCircle, FileText, Clock } from 'lucide-react';
import { apiService } from '../../services/api';
import { HealthRecord, UserRole } from '../../types';
import { UploadModal } from './UploadModal';
import { bdmsColors } from '../../theme/bdmsTheme';

interface RegistryViewProps {
  userRole?: UserRole;
  staffId: string;
}

export const RegistryView: React.FC<RegistryViewProps> = ({ userRole, staffId }) => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [staffId]);

  const loadRecords = async () => {
    const res = await apiService.getHealthRecords(staffId);
    if (res.success && res.data) {
      setRecords(res.data);
    }
  };

  const handleVerify = async (recordUuid: string, status: 'VERIFIED' | 'REJECTED') => {
    const res = await apiService.verifyRecord(recordUuid, status);
    if (res.success) {
      loadRecords();
    }
  };

  const isIcOrPhysician = userRole === 'INFECTION_CONTROL' || userRole === 'PHYSICIAN';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
            บันทึกวัคซีนและผลตรวจสุขภาพ (Immunity & Health Registry)
          </Typography>
          <Typography variant="body2" sx={{ color: bdmsColors.textSecondary }}>
            รหัสบุคลากร: {staffId} | ตรวจสอบและยืนยันข้อมูลตามมาตรฐานอาชีวอนามัย
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          startIcon={<Plus size={18} />}
          onClick={() => setUploadOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          อัปโหลดหลักฐานวัคซีน/ผลตรวจ
        </Button>
      </Box>

      {userRole === 'DATA_OWNER' && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          ⚠️ เอกสารหลักฐานที่อัปโหลดจะผ่านกระบวนการตรวจสอบโดยทีม Infection Control (IC) ก่อนที่สถานะความพร้อมการทำงาน (Work Readiness) จะถูกอัปเดต
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>รายการสุขภาพ (Category)</TableCell>
              <TableCell>ประเภท</TableCell>
              <TableCell>ผลตรวจ / สถานะ</TableCell>
              <TableCell>วันที่รับบริการ/ตรวจ</TableCell>
              <TableCell>เอกสารแนบ (UUID Security)</TableCell>
              <TableCell align="center">สถานะการตรวจสอบ</TableCell>
              {isIcOrPhysician && <TableCell align="center">ดำเนินการ (Actions)</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((row) => (
              <TableRow key={row.recordUuid} hover>
                <TableCell sx={{ fontWeight: 700, color: bdmsColors.navy }}>{row.category}</TableCell>
                <TableCell>
                  <Chip label={row.recordType} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{row.resultOrStatus}</TableCell>
                <TableCell>{row.administeredOrTestDate}</TableCell>
                <TableCell>
                  {row.documentFileName ? (
                    <Chip
                      icon={<FileText size={14} />}
                      label={row.documentFileName}
                      size="small"
                      color="primary"
                      clickable
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                      ไม่มีไฟล์แนบ
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  {row.verificationStatus === 'VERIFIED' && (
                    <Chip icon={<CheckCircle size={14} />} label="VERIFIED" color="success" size="small" />
                  )}
                  {row.verificationStatus === 'PENDING_VERIFICATION' && (
                    <Chip icon={<Clock size={14} />} label="PENDING VERIFY" color="warning" size="small" />
                  )}
                  {row.verificationStatus === 'REJECTED' && (
                    <Chip icon={<XCircle size={14} />} label="REJECTED" color="error" size="small" />
                  )}
                </TableCell>
                {isIcOrPhysician && (
                  <TableCell align="center">
                    {row.verificationStatus === 'PENDING_VERIFICATION' ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="ยืนยันอนุมัติ (Verify)">
                          <IconButton color="success" size="small" onClick={() => handleVerify(row.recordUuid, 'VERIFIED')}>
                            <CheckCircle size={20} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ปฏิเสธเอกสาร (Reject)">
                          <IconButton color="error" size="small" onClick={() => handleVerify(row.recordUuid, 'REJECTED')}>
                            <XCircle size={20} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        {row.verifiedBy ? `โดย ${row.verifiedBy}` : '-'}
                      </Typography>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <UploadModal open={uploadOpen} staffId={staffId} onClose={() => setUploadOpen(false)} onSuccess={loadRecords} />
    </Box>
  );
};
