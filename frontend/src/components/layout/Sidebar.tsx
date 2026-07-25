import React from 'react';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Typography, Divider } from '@mui/material';
import { LayoutDashboard, Users, Stethoscope, FileSpreadsheet, Sliders, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types';
import { bdmsColors } from '../../theme/bdmsTheme';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userRole?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, userRole }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ดติดตามภาพรวม',
      icon: <LayoutDashboard size={20} />,
      roles: ['INFECTION_CONTROL', 'HR', 'PHYSICIAN', 'SUPERUSER', 'ADMIN']
    },
    {
      id: 'registry',
      label: 'บันทึกวัคซีน & ผลตรวจ',
      icon: <FileSpreadsheet size={20} />,
      roles: ['INFECTION_CONTROL', 'PHYSICIAN', 'DATA_OWNER', 'SUPERUSER', 'ADMIN', 'NORMAL_USER']
    },
    {
      id: 'staff',
      label: 'ข้อมูลบุคลากร (Staff Master)',
      icon: <Users size={20} />,
      roles: ['INFECTION_CONTROL', 'HR', 'PHYSICIAN', 'SUPERUSER', 'ADMIN']
    },
    {
      id: 'physician',
      label: 'การประเมินแพทย์ (Physician)',
      icon: <Stethoscope size={20} />,
      roles: ['PHYSICIAN', 'INFECTION_CONTROL', 'SUPERUSER', 'ADMIN']
    },
    {
      id: 'rules',
      label: 'จัดการเกณฑ์สุขภาพ (Rules)',
      icon: <Sliders size={20} />,
      roles: ['INFECTION_CONTROL', 'PHYSICIAN', 'SUPERUSER', 'ADMIN']
    },
    {
      id: 'audit',
      label: 'ประวัติระบบ (Audit Logs)',
      icon: <ShieldCheck size={20} />,
      roles: ['INFECTION_CONTROL', 'SUPERUSER', 'ADMIN']
    }
  ];

  const filteredItems = menuItems.filter((item) => !userRole || item.roles.includes(userRole));

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 260,
          boxSizing: 'border-box',
          top: 64, // Height of AppBar
          height: 'calc(100% - 64px)',
          borderRight: `1px solid ${bdmsColors.border}`,
          backgroundColor: '#FAFAFA'
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: bdmsColors.textSecondary, letterSpacing: 0.8 }}>
          NAVIGATION MENU
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {filteredItems.map((item) => {
          const isSelected = currentTab === item.id;
          return (
            <ListItemButton
              key={item.id}
              selected={isSelected}
              onClick={() => onTabChange(item.id)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: isSelected ? bdmsColors.red : bdmsColors.textPrimary,
                backgroundColor: isSelected ? 'rgba(229, 57, 53, 0.08)' : 'transparent',
                fontWeight: isSelected ? 700 : 500,
                '&:hover': {
                  backgroundColor: isSelected ? 'rgba(229, 57, 53, 0.12)' : 'rgba(10, 37, 64, 0.04)'
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected ? bdmsColors.red : bdmsColors.navy,
                  minWidth: 36
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: isSelected ? 700 : 500
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
};
