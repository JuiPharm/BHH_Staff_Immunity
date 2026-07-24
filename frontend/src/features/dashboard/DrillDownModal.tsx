import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Box,
  CircularProgress,
  Typography
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import { apiService } from '../../services/api';

interface DrillDownModalProps {
  open: boolean;
  category: string | null;
  userRole: string;
  onClose: () => void;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({ open, category, userRole, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (open && category) {
      setLoading(true);
      apiService
        .getDrillDownDetail(userRole, category)
        .then((res: any) => {
          setItems(res.data?.items || []);
        })
        .finally(() => setLoading(false));
    }
  }, [open, category, userRole]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#0A2540', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          รายละเอียดรายชื่อบุคลากร (DRILL-DOWN: {category})
        </Typography>
        <Chip icon={<ShieldIcon sx={{ color: '#FFFFFF !important' }} />} label="RBAC Re-authorized" size="small" color="success" />
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>StaffID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ชื่อ-นามสกุล</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>แผนก</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>กลุ่มงาน</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>สถานะความพร้อม</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    ไม่พบข้อมูลบุคลากรในหมวดหมู่นี้
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <TableRow key={row.staffId || idx} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#0A2540' }}>{row.staffId}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>{row.workGroup || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        color={String(row.status).includes('Complete') || String(row.status).includes('ครบถ้วน') ? 'success' : 'warning'}
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
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ backgroundColor: '#0A2540' }}>
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Dialog>
  );
};
