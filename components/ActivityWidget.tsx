// components/ActivityWidget.tsx
import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Box,
} from '@mui/material'
import {
  Timeline,
  CheckCircle,
  Assignment,
  Update,
  ExpandMore,
} from '@mui/icons-material'
import { useRouter } from 'next/router'

export const ActivityWidget: React.FC = () => {
  const router = useRouter()

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <Timeline /> Recent Activity
          </Typography>
          <Button
            size="small"
            onClick={() => router.push('/dashboard/activity')}
            endIcon={<ExpandMore />}
          >
            View All
          </Button>
        </Box>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Writing Task Completed"
              secondary="2 hours ago"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Assignment color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="New Task from Codex"
              secondary="4 hours ago"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Update color="info" />
            </ListItemIcon>
            <ListItemText
              primary="Profile Updated"
              secondary="Yesterday"
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  )
}