import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Grid, MenuItem, Alert
} from '@mui/material';
import { bdmsColors } from '../../theme/bdmsTheme';
import { apiService } from '../../services/api';
import { WorkGroup, Gender } from '../../types';

interface AddStaffModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    staffId: '',
    hn: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '1990-01-01',
    sex: 'MALE' as Gender,
    bloodGroup: 'O+',
    address: 'หาดใหญ่ สงขลา',
    emergencyPhone: '0800000000',
    email: '',
    department: 'IC_DEPT',
    workGroup: 'CLINICAL' as WorkGroup,
    startDate: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      StaffID: formData.staffId,
      HN: formData.hn,
      FirstName: formData.firstName,
      LastName: formData.lastName,
      DateOfBirth: formData.dateOfBirth,
      Sex: formData.sex,
      BloodGroup: formData.bloodGroup,
      Address: formData.address,
      EmergencyPhone: formData.emergencyPhone,
      Email: formData.email,
      DepartmentCode: formData.department,
      WorkGroup: formData.workGroup,
      EmploymentStatus: 'ACTIVE',
      StartDate: formData.startDate
    };

    const res = await apiService.createStaff(payload);
    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error?.message || 'ไม่สามารถเพิ่มข้อมูลพนักงานได้');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: bdmsColors.navy }}>
          ➕ เพิ่มข้อมูลพนักงานรายคน (Manual Staff Entry)
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="รหัสพนักงาน (StaffID)"
                name="staffId"
                value={formData.staffId}
                onChange={handleChange}
                required
                placeholder="เช่น ST9002"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="เลข HN (ถ้ามี)"
                name="hn"
                value={formData.hn}
                onChange={handleChange}
                placeholder="เช่น HN123456"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ชื่อ (FirstName)"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="นามสกุล (LastName)"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="อีเมล (Email)"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="name@bdms.co.th"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="เบอร์โทรฉุกเฉิน"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="กลุ่มงาน (WorkGroup)"
                name="workGroup"
                value={formData.workGroup}
                onChange={handleChange}
              >
                <MenuItem value="CLINICAL">CLINICAL (บุคลากรทางการแพทย์)</MenuItem>
                <MenuItem value="FRONTLINE">FRONTLINE (ด่านหน้า)</MenuItem>
                <MenuItem value="BACKOFFICE">BACKOFFICE (สนับสนุน)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="แผนก (Department)"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="วันเกิด (DateOfBirth)"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลพนักงาน'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
