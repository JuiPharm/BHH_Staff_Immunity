import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Button, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { apiService } from '../../services/api';
import { CompletenessDashboard } from './CompletenessDashboard';
import { FollowUpDashboard } from './FollowUpDashboard';
import { ProgressDashboard } from './ProgressDashboard';
import { DrillDownModal } from './DrillDownModal';

interface DashboardViewProps {
  userRole: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDrillDown, setSelectedDrillDown] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completenessData, setCompletenessData] = useState<any>(null);
  const [followUpData, setFollowUpData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAllDashboards = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, followRes, progRes] = await Promise.all([
        apiService.getCompletenessDashboard(userRole),
        apiService.getFollowUpDashboard(userRole),
        apiService.getProgressDashboard(userRole)
      ]);

      if (compRes.success) setCompletenessData(compRes.data);
      if (followRes.success) setFollowUpData(followRes.data);
      if (progRes.success) setProgressData(progRes.data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole !== 'DATA_OWNER') {
      loadAllDashboards();
    }
  }, [userRole]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await apiService.refreshDashboardCache(userRole);
      await loadAllDashboards();
    } finally {
      setRefreshing(false);
    }
  };

  if (userRole === 'DATA_OWNER') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning" variant="filled">
          บุคลากรเจ้าของข้อมูลไม่ได้รับอนุญาตให้เข้าถึงแดชบอร์ดสรุปภาพรวมทั้งองค์กร กรุณาใช้งานเมนู "ประวัติของฉัน"
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header & Manual Refresh Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ color: '#0A2540' }}>
            ศูนย์ควบคุมภูมิคุ้มกันและสุขภาพบุคลากร (Staff Immunity Control Center)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            โรงพยาบาลกรุงเทพหาดใหญ่ (Bangkok Hospital Hat Yai) • ล่าสุดเมื่อ: {completenessData?.calculatedAt || 'คำนวณสด'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={refreshing ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
          onClick={handleManualRefresh}
          disabled={refreshing}
          sx={{ backgroundColor: '#0A2540', '&:hover': { backgroundColor: '#1565C0' }, fontWeight: 700 }}
        >
          {refreshing ? 'กำลังประมวลผล...' : 'คำนวณสถิติล่าสุด (Manual Refresh)'}
        </Button>
      </Box>

      {/* Tabs Row */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<AnalyticsIcon />} iconPosition="start" label="1. ความครอบคลุม (Completeness)" sx={{ fontWeight: 700 }} />
          <Tab icon={<AccessTimeIcon />} iconPosition="start" label="2. การติดตาม (Follow-up)" sx={{ fontWeight: 700 }} />
          <Tab icon={<ShowChartIcon />} iconPosition="start" label="3. ความก้าวหน้า (Progress)" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {/* Loading & Error States */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tab Panels */}
      {!loading && activeTab === 0 && (
        <CompletenessDashboard data={completenessData} onDrillDown={(cat) => setSelectedDrillDown(cat)} />
      )}

      {!loading && activeTab === 1 && (
        <FollowUpDashboard data={followUpData} onDrillDown={(cat) => setSelectedDrillDown(cat)} />
      )}

      {!loading && activeTab === 2 && (
        <ProgressDashboard data={progressData} />
      )}

      {/* Drill-down Modal */}
      <DrillDownModal
        open={Boolean(selectedDrillDown)}
        category={selectedDrillDown}
        userRole={userRole}
        onClose={() => setSelectedDrillDown(null)}
      />
    </Box>
  );
};
