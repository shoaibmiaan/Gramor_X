// types/teacher.ts
// Teacher–cohort management types
import type { ApiResult } from "./api";

export interface TeacherCohort {
  id: string;
  teacherId: string;
  name: string;
  createdAt: string; // ISO timestamp
}

export interface TeacherCohortMember {
  id: string;
  cohortId: string;
  studentId: string;
  joinedAt: string; // ISO timestamp
  progress: Record<string, any>; // flexible per-assignment progress
}

export interface TeacherAssignment {
  id: string;
  cohortId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date
  createdAt: string;
}

// API contracts

// Cohorts
export type TeacherCohortsResponse = ApiResult<{ cohorts: TeacherCohort[] }>;

// Cohort members
export type TeacherCohortMembersResponse = ApiResult<{ members: TeacherCohortMember[] }>;

// Assignments
export interface TeacherAssignTaskRequest {
  cohortId: string;
  title: string;
  description?: string;
  dueDate: string;
}
export type TeacherAssignTaskResponse = ApiResult<{ assignment: TeacherAssignment }>;
