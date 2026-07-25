import React from 'react';
import { Box, Grid, Paper, Typography, LinearProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface ProgressDashboardProps {
  data: any;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ data }) => {
  if (!data) return null;

  return (
    <Box sx={{ mt: 2 }}>
      {/* Overview Metric Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #2E7D32' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                ดำเนินการสำเร็จในเดือนนี้ (COMPLETED ACTIONS)
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} color="success.main">
              {data.completedActionsThisMonth ?? 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              การฉีดวัคซีน ผล Lab และ CXR ที่อนุมัติแล้ว
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #1976D2' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                รายการใหม่ที่ต้องทำเดือนนี้ (NEW ACTIONS)
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} color="primary.main">
              {data.newActionsThisMonth ?? 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              บุคลากรใหม่และวัคซีนเข็มถัดไป
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #E53935' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUpIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                แนวโน้มคงค้าง (OVERDUE TREND)
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} color="error.main">
              {data.overdueTrendCount ?? 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {data.overdueTrendMessage || 'คำนวณจากประวัติการอนุมัติจริง'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Completion Trend Visualization */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#0A2540', mb: 3 }}>
          แนวโน้มอัตราความครอบคลุมภูมิคุ้มกันรายเดือน (Completion Trend)
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(data.completionTrend || []).map((trend: any) => (
            <Box key={trend.month}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={700} color="#0A2540">
                  {trend.month}
                </Typography>
                <Typography variant="body2" fontWeight={800} color="primary">
                  {trend.rate}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={trend.rate}
                sx={{ height: 10, borderRadius: 5, backgroundColor: '#E0E0E0' }}
              />
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};
