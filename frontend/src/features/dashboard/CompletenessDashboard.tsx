import React from 'react';
import { Box, Grid, Card, CardContent, Typography, LinearProgress, Paper, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface CompletenessDashboardProps {
  data: any;
  onDrillDown: (category: string) => void;
}

export const CompletenessDashboard: React.FC<CompletenessDashboardProps> = ({ data, onDrillDown }) => {
  const safeData = data || {
    totalStaff: 0,
    completeCount: 0,
    incompleteCount: 0,
    completionRate: 0,
    pendingVerificationQueue: 0,
    workGroupBreakdown: {
      CLINICAL: { total: 0, complete: 0, rate: 0 },
      FRONTLINE: { total: 0, complete: 0, rate: 0 },
      BACKOFFICE: { total: 0, complete: 0, rate: 0 }
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Metric Cards Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('TOTAL')}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, borderLeft: '5px solid #0A2540' }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                บุคลากรทั้งหมด (TOTAL STAFF)
              </Typography>
              <Typography variant="h3" sx={{ color: '#0A2540', fontWeight: 800, my: 1 }}>
                {safeData.totalStaff}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ครอบคลุมบุคลากรทุกกลุ่มงาน
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('COMPLETE')}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, borderLeft: '5px solid #2E7D32' }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                ภูมิคุ้มกันสมบูรณ์ (COMPLETE)
              </Typography>
              <Typography variant="h3" sx={{ color: '#2E7D32', fontWeight: 800, my: 1 }}>
                {safeData.completeCount}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" fontWeight={700} color="success.main">
                  {safeData.completionRate}% ความพร้อมสถาบัน
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('INCOMPLETE')}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, borderLeft: '5px solid #E53935' }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                ต้องรับวัคซีน/ตรวจเพิ่ม (INCOMPLETE)
              </Typography>
              <Typography variant="h3" sx={{ color: '#E53935', fontWeight: 800, my: 1 }}>
                {safeData.incompleteCount}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningAmberIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" color="error.main" fontWeight={700}>
                  {Math.max(0, 100 - safeData.completionRate)}% ยังไม่ครบตามเกณฑ์
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('PENDING_VERIFICATION')}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, borderLeft: '5px solid #ED6C02' }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                รอการอนุมัติเอกสาร (PENDING)
              </Typography>
              <Typography variant="h3" sx={{ color: '#ED6C02', fontWeight: 800, my: 1 }}>
                {safeData.pendingVerificationQueue}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PendingActionsIcon color="warning" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" color="warning.main" fontWeight={700}>
                  หลักฐานรอ IC ตรวจสอบ
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Work Group Breakdown Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#0A2540', mb: 2 }}>
          สถิติแยกตามกลุ่มงาน (Work Group Breakdown)
        </Typography>
        <Grid container spacing={3}>
          {Object.entries(safeData.workGroupBreakdown || {}).map(([group, stats]: [string, any]) => (
            <Grid item xs={12} md={4} key={group}>
              <Box sx={{ p: 2, border: '1px solid #E0E0E0', borderRadius: 2, backgroundColor: '#F8FAFC' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip
                    label={group}
                    color={group === 'CLINICAL' ? 'primary' : group === 'FRONTLINE' ? 'warning' : 'default'}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="subtitle2" fontWeight={800} color="primary">
                    {stats?.rate || 0}%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  ครบเกณฑ์ {stats?.complete || 0} จาก {stats?.total || 0} คน
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={stats?.rate || 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};
