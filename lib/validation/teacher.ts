import { z } from 'zod';

export const teacherRegisterSchema = z.object({
  teacher_subjects: z.array(z.string().min(1)).min(1, 'Select at least one subject'),
  teacher_bio: z.string().min(50, 'Bio must be at least 50 characters').max(2000),
  teacher_experience_years: z.number().int().min(0).max(50),
  teacher_cv_url: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
});

export type TeacherRegisterInput = z.infer<typeof teacherRegisterSchema>;
