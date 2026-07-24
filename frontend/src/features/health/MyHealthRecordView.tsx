import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Chip, Button, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import { getStoredSession } from '../../services/api';
import { UploadModal } from '../registry/UploadModal';

export const MyHealthRecordView: React.FC = () => {
  const session = getStoredSession();
  const [uploadOpen, setUploadOpen] = useState(false);

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
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, borderLeft: '6px solid #2E7D32' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircleIcon color="success" />
          <Typography variant="h6" fontWeight={700} color="#0A2540">
            สถานะความพร้อมในการปฏิบัติงาน (Work Readiness Status)
          </Typography>
        </Box>
        <Chip label="CLEARED (พร้อมปฏิบัติงานเต็มรูปแบบ)" color="success" sx={{ fontWeight: 800, fontSize: 16, py: 2, px: 1, my: 1 }} />
        <Typography variant="body2" color="text.secondary">
          มีภูมิคุ้มกันและผลตรวจสุขภาพผ่านตามเกณฑ์สถาบันโรงพยาบาลกรุงเทพหาดใหญ่ครบถ้วน 100%
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

        <Table>
          <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>หมวดหมู่</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ประเภท</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>วันที่รับบริการ/ตรวจ</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>สถานะการอนุมัติ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow hover>
              <TableCell sx={{ fontWeight: 700 }}>MMR (หัด-หัดเยอรมัน-คางทูม)</TableCell>
              <TableCell>VACCINE</TableCell>
              <TableCell>2025-05-10</TableCell>
              <TableCell><Chip label="VERIFIED" color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell sx={{ fontWeight: 700 }}>VARICELLA (สุกใส)</TableCell>
              <TableCell>VACCINE</TableCell>
              <TableCell>2025-06-01</TableCell>
              <TableCell><Chip label="VERIFIED" color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell sx={{ fontWeight: 700 }}>CHEST X-RAY (เอกซเรย์ปอด)</TableCell>
              <TableCell>LAB_TEST</TableCell>
              <TableCell>2026-01-15</TableCell>
              <TableCell><Chip label="VERIFIED" color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* Evidence Upload Modal */}
      <UploadModal
        open={uploadOpen}
        staffId={session?.staffId || 'ST8004'}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => setUploadOpen(false)}
      />
    </Box>
  );
};
