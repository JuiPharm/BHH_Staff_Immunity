import React, { useState } from 'react';
import {
  Box, Typography, Button, Chip, Paper, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, FormGroup, FormControlLabel, Checkbox
} from '@mui/material';
import { Plus, CheckCircle2, FileEdit } from 'lucide-react';
import { bdmsColors } from '../../theme/bdmsTheme';
import { WorkGroup } from '../../types';

interface RuleItem {
  version: number;
  workGroup: WorkGroup;
  effectiveDate: string;
  status: 'ACTIVE' | 'DRAFT' | 'PENDING_APPROVAL';
  requirements: string[];
}

export const RuleConfiguratorView: React.FC = () => {
  const [rules, setRules] = useState<RuleItem[]>([
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
  ]);

  const [draftOpen, setDraftOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WorkGroup>('CLINICAL');
  const [effectiveDate, setEffectiveDate] = useState('2026-08-01');
  const [selectedReqs, setSelectedReqs] = useState<string[]>([
    'Hepatitis B (3 doses)', 'MMR (2 doses)', 'Influenza (Annual)'
  ]);

  const availableRequirements = [
    'Hepatitis B (3 doses / Titre >= 10)',
    'MMR (2 doses)',
    'Varicella (2 doses / IgG+)',
    'Tdap (Every 10 yrs)',
    'Influenza (Annual)',
    'Chest X-Ray (Annual)',
    'TST/LTBI Screening',
    'COVID-19 Booster (Annual)'
  ];

  const handleToggleReq = (req: string) => {
    if (selectedReqs.includes(req)) {
      setSelectedReqs(selectedReqs.filter(r => r !== req));
    } else {
      setSelectedReqs([...selectedReqs, req]);
    }
  };

  const handleCreateDraft = () => {
    const existingCount = rules.filter(r => r.workGroup === selectedGroup).length;
    const newRule: RuleItem = {
      version: existingCount + 1,
      workGroup: selectedGroup,
      effectiveDate: effectiveDate,
      status: 'DRAFT',
      requirements: selectedReqs
    };

    setRules([newRule, ...rules]);
    setDraftOpen(false);
  };

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
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          onClick={() => setDraftOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          ร่างเกณฑ์ใหม่ (Draft New Rule Version)
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        💡 กฎเกณฑ์สุขภาพจะทำงานแบบ Versioned มีวันที่มีผลบังคับใช้ (Effective Date) และต้องได้รับการอนุมัติโดยทีม IC/Physician ก่อนเปิดใช้งานจริง
      </Alert>

      {rules.map((rule, idx) => (
        <Paper key={`${rule.workGroup}-${rule.version}-${idx}`} sx={{ p: 3, mb: 3, borderRadius: 3, borderLeft: rule.status === 'DRAFT' ? `6px solid ${bdmsColors.warning}` : `6px solid ${bdmsColors.success}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: bdmsColors.navy }}>
                กลุ่มงาน: {rule.workGroup}
              </Typography>
              <Chip label={`Version ${rule.version}`} size="small" color="primary" />
              <Chip
                label={rule.status}
                size="small"
                color={rule.status === 'DRAFT' ? 'warning' : 'success'}
                icon={rule.status === 'DRAFT' ? <FileEdit size={14} /> : <CheckCircle2 size={14} />}
              />
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

      {/* Modal Dialog for Drafting New Rule Version */}
      <Dialog open={draftOpen} onClose={() => setDraftOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: bdmsColors.navy }}>
          📝 ร่างเกณฑ์สุขภาพเวอร์ชันใหม่ (Draft New Rule Version)
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            select
            label="เลือกกลุ่มงาน (WorkGroup)"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value as WorkGroup)}
            margin="normal"
          >
            <MenuItem value="CLINICAL">CLINICAL (บุคลากรทางการแพทย์)</MenuItem>
            <MenuItem value="FRONTLINE">FRONTLINE (บุคลากรด่านหน้า)</MenuItem>
            <MenuItem value="BACKOFFICE">BACKOFFICE (ฝ่ายสนับสนุน)</MenuItem>
          </TextField>

          <TextField
            fullWidth
            type="date"
            label="วันที่มีผลบังคับใช้ (Effective Date)"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1, color: bdmsColors.navy }}>
            เลือกเกณฑ์วัคซีนและผลแล็บที่ต้องผ่าน (Mandatory Requirements):
          </Typography>

          <FormGroup>
            {availableRequirements.map((req) => (
              <FormControlLabel
                key={req}
                control={
                  <Checkbox
                    checked={selectedReqs.includes(req)}
                    onChange={() => handleToggleReq(req)}
                  />
                }
                label={req}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDraftOpen(false)} color="inherit">
            ยกเลิก
          </Button>
          <Button onClick={handleCreateDraft} variant="contained" color="primary">
            บันทึกร่างเกณฑ์ใหม่ (Save Draft)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
