import type { TeacherProfile, UpsertTeacherPayload } from '@/types/db/teacher';

export type GetMyTeacherResponse = {
  profile: TeacherProfile | null;
};

export type RegisterTeacherRequest = UpsertTeacherPayload;

export type RegisterTeacherResponse = {
  profile: TeacherProfile;
};
