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
  Alert,
  TextField,
  InputAdornment
} from '@mui/material';
import { Upload, Search, UserPlus } from 'lucide-react';
import { apiService } from '../../services/api';
import { StaffMaster, UserRole } from '../../types';
import { ImportModal } from './ImportModal';
import { AddStaffModal } from './AddStaffModal';
import { bdmsColors } from '../../theme/bdmsTheme';

interface StaffListViewProps {
  userRole?: UserRole;
}

export const StaffListView: React.FC<StaffListViewProps> = ({ userRole }) => {
  const [staffList, setStaffList] = useState<StaffMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    const res = await apiService.getStaffList();
    if (res.success && res.data) {
      const dataArray = Array.isArray(res.data) ? res.data : (res.data as any).items || [];
      setStaffList(dataArray);
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
            ข้อมูลบุคลากร (Staff Master Directory)
          </Typography>
          <Typography variant="body2" sx={{ color: bdmsColors.textSecondary }}>
            โรงพยาบาลกรุงเทพหาดใหญ่ (จำนวนบุคลากรในระบบ: {staffList.length} คน)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {(userRole === 'HR' || userRole === 'SUPERUSER' || userRole === 'ADMIN') && (
            <>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<UserPlus size={18} />}
                onClick={() => setAddStaffOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                เพิ่มพนักงานรายคน (Manual Entry)
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Upload size={18} />}
                onClick={() => setImportOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                Import Staff Master (Excel/CSV)
              </Button>
            </>
          )}
        </Box>
      </Box>

      {userRole === 'HR' && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          🔒 สิทธิ์ HR: สามารถดูและแก้ไขข้อมูลพื้นฐานบุคลากรได้ แต่ข้อมูลผลตรวจสุขภาพทางห้องปฏิบัติการจะถูก Mask ตามนโยบาย Data Privacy
        </Alert>
      )}

      <Box sx={{ mb: 2.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="ค้นหาตาม รหัสพนักงาน, ชื่อ-นามสกุล, หรือ แผนก..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            )
          }}
          sx={{ maxWidth: 400, bgcolor: '#FFF', borderRadius: 2 }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>StaffID</TableCell>
              <TableCell>ชื่อ-นามสกุล</TableCell>
              <TableCell>แผนก</TableCell>
              <TableCell>กลุ่มงาน (Work Group)</TableCell>
              <TableCell>อีเมลองค์กร</TableCell>
              <TableCell>เบอร์ติดต่อ</TableCell>
              <TableCell align="center">สถานะความพร้อม (Work Readiness)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStaff.map((row) => (
              <TableRow key={row.staffId} hover>
                <TableCell sx={{ fontWeight: 700, color: bdmsColors.navy }}>{row.staffId}</TableCell>
                <TableCell>{row.firstName} {row.lastName}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>
                  <Chip label={row.workGroup} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.phone}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={row.workReadiness || 'CLEARED'}
                    color={row.workReadiness === 'NOT_CLEARED' ? 'error' : row.workReadiness === 'CONDITIONALLY_CLEARED' ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImportSuccess={() => loadStaff()} />
      <AddStaffModal open={addStaffOpen} onClose={() => setAddStaffOpen(false)} onSuccess={() => loadStaff()} />
    </Box>
  );
};
