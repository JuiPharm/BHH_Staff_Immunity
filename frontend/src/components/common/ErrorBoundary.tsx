import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error Boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500, borderRadius: 2 }}>
            <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} color="#0A2540" sx={{ mb: 1 }}>
              เกิดข้อผิดพลาดไม่คาดคิดในระบบ
            </Typography>

            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ backgroundColor: '#0A2540', mt: 2 }}
            >
              โหลดหน้าระบบใหม่ (Reload)
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
