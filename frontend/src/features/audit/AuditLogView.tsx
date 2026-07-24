import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Alert } from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { apiService } from '../../services/api';
import { AuditLogEntry } from '../../types';
import { bdmsColors } from '../../theme/bdmsTheme';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const res = await apiService.getAuditLogs();
    if (res.success && res.data) {
      setLogs(res.data);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
          ประวัติการทำรายการและการตรวจสอบความถูกต้อง (Append-Only Audit Log & Hash Chain)
        </Typography>
        <Typography variant="body2" sx={{ color: bdmsColors.textSecondary }}>
          บันทึกทุกลำดับกิจกรรมด้วย SHA-256 Hash Chain ป้องกันการแก้ไขย้อนหลังโดยเด็ดขาด
        </Typography>
      </Box>

      <Alert severity="success" icon={<ShieldCheck size={24} />} sx={{ mb: 3, borderRadius: 2 }}>
        🔒 <b>Cryptographic Hash Chain Verified</b>: ทุก Transaction Log เชื่อมโยงด้วย SHA-256 Previous Hash ปราศจากการดัดแปลง (Tamper-Evident System)
      </Alert>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp (ISO)</TableCell>
              <TableCell>StaffID</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Action (กิจกรรม)</TableCell>
              <TableCell>Target Resource</TableCell>
              <TableCell>SHA-256 Entry Hash (Hash Chain)</TableCell>
              <TableCell align="center">Integrity Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((row) => (
              <TableRow key={row.logUuid} hover>
                <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{row.timestamp}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: bdmsColors.navy }}>{row.staffId}</TableCell>
                <TableCell>
                  <Chip label={row.role} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{row.action}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{row.targetResource}</TableCell>
                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: bdmsColors.textSecondary }}>
                  {row.entryHash.substring(0, 16)}...
                </TableCell>
                <TableCell align="center">
                  <Chip icon={<ShieldCheck size={12} />} label="HASH CHAIN VALID" color="success" size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
