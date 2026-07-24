import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Button, Avatar, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { ShieldAlert, LogOut, RefreshCw, KeyRound, Building2 } from 'lucide-react';
import { UserSession, UserRole } from '../../types';
import { bdmsColors } from '../../theme/bdmsTheme';

interface HeaderProps {
  session: UserSession | null;
  onLogout: () => void;
  onRoleSwitch: (role: UserRole) => void;
  onChangePassword: () => void;
}

export const Header: React.FC<HeaderProps> = ({ session, onLogout, onRoleSwitch, onChangePassword }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [roleAnchorEl, setRoleAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'INFECTION_CONTROL':
        return 'Infection Control (IC)';
      case 'HR':
        return 'Human Resources (HR)';
      case 'PHYSICIAN':
        return 'Physician (แพทย์)';
      case 'DATA_OWNER':
        return 'Staff (บุคลากร)';
      default:
        return 'Guest';
    }
  };

  const getRoleColor = (role?: UserRole) => {
    switch (role) {
      case 'INFECTION_CONTROL':
        return bdmsColors.red;
      case 'HR':
        return bdmsColors.info;
      case 'PHYSICIAN':
        return '#8E24AA'; // Purple
      case 'DATA_OWNER':
        return bdmsColors.success;
      default:
        return '#757575';
    }
  };

  return (
    <AppBar position="sticky" elevation={2}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        {/* BDMS Hospital Logo & Brand Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: bdmsColors.red,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: bdmsColors.white,
              boxShadow: '0 2px 8px rgba(229, 57, 53, 0.4)',
            }}
          >
            <ShieldAlert size={24} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: bdmsColors.white }}>
              Staff Immunity & Health Registry
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.2 }}>
              <Building2 size={12} color="#94A3B8" />
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                โรงพยาบาลกรุงเทพหาดใหญ่ (BDMS)
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* User Account Controls */}
        {session ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Quick Demo Role Switcher */}
            <Chip
              icon={<RefreshCw size={14} style={{ color: '#FFF' }} />}
              label={`Role: ${getRoleLabel(session.role)}`}
              onClick={(e) => setRoleAnchorEl(e.currentTarget)}
              sx={{
                backgroundColor: getRoleColor(session.role),
                color: '#FFF',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { opacity: 0.9 },
              }}
            />

            <Menu anchorEl={roleAnchorEl} open={Boolean(roleAnchorEl)} onClose={() => setRoleAnchorEl(null)}>
              <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.8rem', color: bdmsColors.textSecondary }}>
                สลับบทบาททดสอบ (Demo Role Switch):
              </MenuItem>
              <MenuItem onClick={() => { onRoleSwitch('INFECTION_CONTROL'); setRoleAnchorEl(null); }}>
                Infection Control (IC)
              </MenuItem>
              <MenuItem onClick={() => { onRoleSwitch('HR'); setRoleAnchorEl(null); }}>
                Human Resources (HR)
              </MenuItem>
              <MenuItem onClick={() => { onRoleSwitch('PHYSICIAN'); setRoleAnchorEl(null); }}>
                Physician (แพทย์)
              </MenuItem>
              <MenuItem onClick={() => { onRoleSwitch('DATA_OWNER'); setRoleAnchorEl(null); }}>
                Data Owner (บุคลากร)
              </MenuItem>
            </Menu>

            <Button
              onClick={handleMenuOpen}
              sx={{ color: '#FFF', textTransform: 'none', display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: bdmsColors.navyLight, fontSize: '0.9rem', fontWeight: 700 }}>
                {session.firstName[0]}
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                  {session.firstName} {session.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  {session.staffId} | {session.department}
                </Typography>
              </Box>
            </Button>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={() => { onChangePassword(); handleMenuClose(); }}>
                <ListItemIcon><KeyRound size={18} /></ListItemIcon>
                <ListItemText primary="เปลี่ยนรหัสผ่าน" />
              </MenuItem>
              <MenuItem onClick={() => { onLogout(); handleMenuClose(); }} sx={{ color: bdmsColors.red }}>
                <ListItemIcon><LogOut size={18} color={bdmsColors.red} /></ListItemIcon>
                <ListItemText primary="ออกจากระบบ" />
              </MenuItem>
            </Menu>
          </Box>
        ) : null}
      </Toolbar>
    </AppBar>
  );
};
