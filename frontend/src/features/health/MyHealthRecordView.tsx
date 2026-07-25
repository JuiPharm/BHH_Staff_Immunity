import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid, Chip, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import { getStoredSession, apiService } from '../../services/api';
import { HealthRecord } from '../../types';
import { UploadModal } from '../registry/UploadModal';

export const MyHealthRecordView: React.FC = () => {
  const session = getStoredSession();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHealthRecords = async () => {
    if (!session?.staffId) return;
    setLoading(true);
    const res = await apiService.getHealthRecords(session.staffId);
    setLoading(false);
    if (res.success && res.data) {
      setRecords(res.data);
    }
  };

  useEffect(() => {
    loadHealthRecords();
  }, [session?.staffId]);

  const verifiedCount = records.filter(r => r.verificationStatus === 'VERIFIED').length;
  const isCleared = verifiedCount >= 1 || records.length > 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* User Banner */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: 'linear-gradient(135deg, #0A2540 0%, #1565C0 100%)', color: '#FFFFFF' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                ยินดีต้อนรับ, {session?.firstName} {session?.lastName}
              </Typography>
              <Chip label="Data Owner" color="info" size="small" sx={{ fontWeight: 700 }} />
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              รหัสพนักงาน: {session?.staffId} • แผนก: {session?.department} • กลุ่มงาน: {session?.workGroup}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => setUploadOpen(true)}
              sx={{ backgroundColor: '#E53935', '&:hover': { backgroundColor: '#D32F2F' }, fontWeight: 700 }}
            >
              อัปโหลดเอกสารหลักฐาน
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Readiness Status Card */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, borderLeft: isCleared ? '6px solid #2E7D32' : '6px solid #ED6C02' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircleIcon color={isCleared ? "success" : "warning"} />
          <Typography variant="h6" fontWeight={700} color="#0A2540">
            สถานะความพร้อมในการปฏิบัติงาน (Work Readiness Status)
          </Typography>
        </Box>
        <Chip
          label={isCleared ? "CLEARED (พร้อมปฏิบัติงาน)" : "PENDING (รอการตรวจสอบหลักฐาน)"}
          color={isCleared ? "success" : "warning"}
          sx={{ fontWeight: 800, fontSize: 16, py: 2, px: 1, my: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          {isCleared
            ? "มีประวัติภูมิคุ้มกันและผลตรวจสุขภาพที่ได้รับการยืนยันตามเกณฑ์สถาบันโรงพยาบาลกรุงเทพหาดใหญ่"
            : "กรุณาอัปโหลดหลักฐานฉีดวัคซีนหรือผลแล็บเพื่อเข้ารับการประเมินความพร้อม"}
        </Typography>
      </Paper>

      {/* Personal Health Records Table */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700} color="#0A2540">
            ประวัติการรับวัคซีนและผลตรวจสุขภาพส่วนบุคคล (My Clinical Records)
          </Typography>
          <Chip icon={<ShieldIcon />} label="IDOR Protected (Own Record Only)" color="primary" variant="outlined" size="small" />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>หมวดหมู่</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ประเภท</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ผลตรวจ / สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>วันที่รับบริการ/ตรวจ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>สถานะการอนุมัติ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      ไม่พบประวัติรับบริการหรือผลตรวจในระบบ (สามารถกดอัปโหลดหลักฐานเพื่อบันทึกข้อมูลใหม่ได้)
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((row, idx) => (
                  <TableRow key={row.recordUuid || idx} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{row.category}</TableCell>
                    <TableCell><Chip label={row.recordType || 'VACCINE'} size="small" variant="outlined" /></TableCell>
                    <TableCell>{row.resultOrStatus}</TableCell>
                    <TableCell>{row.administeredOrTestDate}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.verificationStatus || 'VERIFIED'}
                        color={row.verificationStatus === 'REJECTED' ? 'error' : row.verificationStatus === 'PENDING_VERIFICATION' ? 'warning' : 'success'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Evidence Upload Modal */}
      <UploadModal
        open={uploadOpen}
        staffId={session?.staffId || 'ST8004'}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          setUploadOpen(false);
          loadHealthRecords();
        }}
      />
    </Box>
  );
};
