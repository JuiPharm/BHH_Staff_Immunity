import React from 'react';
import { Box, Typography, Button, Chip, Paper, Alert } from '@mui/material';
import { Plus, CheckCircle2 } from 'lucide-react';
import { bdmsColors } from '../../theme/bdmsTheme';

export const RuleConfiguratorView: React.FC = () => {
  const rules = [
    {
      version: 1,
      workGroup: 'CLINICAL',
      effectiveDate: '2026-01-01',
      status: 'ACTIVE',
      requirements: ['Hepatitis B (3 doses / Titre >= 10)', 'MMR (2 doses)', 'Varicella (2 doses / IgG+)', 'Tdap (Every 10 yrs)', 'Influenza (Annual)', 'Chest X-Ray (Annual)', 'TST/LTBI Screening']
    },
    {
      version: 1,
      workGroup: 'FRONTLINE',
      effectiveDate: '2026-01-01',
      status: 'ACTIVE',
      requirements: ['MMR (2 doses)', 'Varicella (2 doses)', 'Tdap (Every 10 yrs)', 'Chest X-Ray (Annual)']
    },
    {
      version: 1,
      workGroup: 'BACKOFFICE',
      effectiveDate: '2026-01-01',
      status: 'ACTIVE',
      requirements: ['Chest X-Ray (Annual)']
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
            การจัดการเกณฑ์ความพร้อมสุขภาพ (Versioned Work-Readiness Rule Engine)
          </Typography>
          <Typography variant="body2" sx={{ color: bdmsColors.textSecondary }}>
            กำหนดเกณฑ์ประเมินวัคซีนและผลตรวจสุขภาพแยกตามกลุ่มงาน ห้าม Hard-code ใน UI
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={18} />} sx={{ fontWeight: 700 }}>
          ร่างเกณฑ์ใหม่ (Draft New Rule Version)
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        💡 กฎเกณฑ์สุขภาพจะทำงานแบบ Versioned มีวันที่มีผลบังคับใช้ (Effective Date) และต้องได้รับการอนุมัติโดยทีม IC/Physician ก่อนเปิดใช้งานจริง
      </Alert>

      {rules.map((rule) => (
        <Paper key={rule.workGroup} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
                กลุ่มงาน: {rule.workGroup}
              </Typography>
              <Chip label={`Version ${rule.version}`} size="small" color="primary" />
              <Chip label={rule.status} size="small" color="success" />
            </Box>
            <Typography variant="caption" sx={{ color: bdmsColors.textSecondary }}>
              วันที่มีผลบังคับใช้: {rule.effectiveDate}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, color: bdmsColors.textPrimary, mb: 1 }}>
            รายการวัคซีนและผลตรวจสุขภาพที่ต้องผ่านเกณฑ์ (Mandatory Requirements):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {rule.requirements.map((req, i) => (
              <Chip key={i} icon={<CheckCircle2 size={14} />} label={req} variant="outlined" color="primary" />
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
