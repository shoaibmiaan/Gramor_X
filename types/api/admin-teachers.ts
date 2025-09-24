import type { TeacherProfile } from '@/types/db/teacher';

export type AdminTeachersListQuery = {
  q?: string;               // search by name/email
  status?: 'pending' | 'all';
  page?: string;            // "1"
  pageSize?: string;        // "20"
};

export type AdminTeachersListResponse = {
  items: TeacherProfile[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminTeacherApproveRequest = {
  userId: string;
};

export type AdminTeacherApproveResponse = {
  ok: true;
  profile: TeacherProfile;
};
