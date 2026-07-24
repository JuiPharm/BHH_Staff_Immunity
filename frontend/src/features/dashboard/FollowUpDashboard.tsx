import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Paper, Chip } from '@mui/material';
import AlarmIcon from '@mui/icons-material/Alarm';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface FollowUpDashboardProps {
  data: any;
  onDrillDown: (category: string) => void;
}

export const FollowUpDashboard: React.FC<FollowUpDashboardProps> = ({ data, onDrillDown }) => {
  if (!data) return null;

  return (
    <Box sx={{ mt: 2 }}>
      {/* Time Window Summary Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('OVERDUE')}
            sx={{ cursor: 'pointer', backgroundColor: '#FFEBEE', borderLeft: '5px solid #D32F2F', '&:hover': { boxShadow: 4 } }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="error.main" fontWeight={800}>
                  เกินกำหนด (OVERDUE)
                </Typography>
                <AlarmIcon color="error" />
              </Box>
              <Typography variant="h3" sx={{ color: '#D32F2F', fontWeight: 800, my: 1 }}>
                {data.overdueCount}
              </Typography>
              <Typography variant="body2" color="error.dark" fontWeight={600}>
                ต้องเร่งรัดติดตามทันที
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('DUE_7_DAYS')}
            sx={{ cursor: 'pointer', backgroundColor: '#FFF3E0', borderLeft: '5px solid #ED6C02', '&:hover': { boxShadow: 4 } }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="warning.dark" fontWeight={800}>
                  ครบกำหนดใน 7 วัน
                </Typography>
                <EventAvailableIcon color="warning" />
              </Box>
              <Typography variant="h3" sx={{ color: '#ED6C02', fontWeight: 800, my: 1 }}>
                {data.dueWithin7Days}
              </Typography>
              <Typography variant="body2" color="warning.dark" fontWeight={600}>
                ต้องได้รับการแจ้งเตือน
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('DUE_30_DAYS')}
            sx={{ cursor: 'pointer', backgroundColor: '#E3F2FD', borderLeft: '5px solid #1976D2', '&:hover': { boxShadow: 4 } }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="primary.main" fontWeight={800}>
                  ครบกำหนดใน 30 วัน
                </Typography>
                <EventAvailableIcon color="primary" />
              </Box>
              <Typography variant="h3" sx={{ color: '#1976D2', fontWeight: 800, my: 1 }}>
                {data.dueWithin30Days}
              </Typography>
              <Typography variant="body2" color="primary.dark" fontWeight={600}>
                เตรียมการนัดหมาย
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => onDrillDown('DUE_60_DAYS')}
            sx={{ cursor: 'pointer', backgroundColor: '#F3E5F5', borderLeft: '5px solid #9C27B0', '&:hover': { boxShadow: 4 } }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#9C27B0' }} fontWeight={800}>
                  ครบกำหนดใน 60 วัน
                </Typography>
                <EventAvailableIcon sx={{ color: '#9C27B0' }} />
              </Box>
              <Typography variant="h3" sx={{ color: '#9C27B0', fontWeight: 800, my: 1 }}>
                {data.dueWithin60Days}
              </Typography>
              <Typography variant="body2" sx={{ color: '#7B1FA2' }} fontWeight={600}>
                วางแผนล่วงหน้า
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Required Actions Breakdown */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#0A2540', mb: 2 }}>
          รายการต้องติดตามตามประเภท (Action Required Categories)
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, border: '1px solid #E0E0E0', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">ฉีดวัคซีนเพิ่ม (Vaccine Required)</Typography>
              <Typography variant="h4" fontWeight={800} color="primary" sx={{ mt: 1 }}>
                {data.vaccineRequired}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, border: '1px solid #E0E0E0', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">เจาะเลือดตรวจ (Lab Required)</Typography>
              <Typography variant="h4" fontWeight={800} color="secondary" sx={{ mt: 1 }}>
                {data.labRequired}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, border: '1px solid #E0E0E0', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">ถ่ายภาพปอด (CXR Required)</Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mt: 1 }}>
                {data.cxrRequired}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, border: '1px solid #E0E0E0', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">รอแพทย์ประเมิน (Physician Review)</Typography>
              <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 1 }}>
                {data.physicianReviewRequired}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Warning alerts row */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Chip
            icon={<ErrorOutlineIcon />}
            label={`เอกสารถูกปฏิเสธ (Rejected Evidence): ${data.rejectedEvidenceCount} รายการ`}
            color="error"
            variant="outlined"
            onClick={() => onDrillDown('REJECTED_EVIDENCE')}
            sx={{ fontWeight: 700, cursor: 'pointer' }}
          />
          <Chip
            icon={<ErrorOutlineIcon />}
            label={`ส่งอีเมลล้มเหลว (Email Failed): ${data.emailFailedCount} รายการ`}
            color="warning"
            variant="outlined"
            onClick={() => onDrillDown('EMAIL_FAILED')}
            sx={{ fontWeight: 700, cursor: 'pointer' }}
          />
        </Box>
      </Paper>
    </Box>
  );
};
