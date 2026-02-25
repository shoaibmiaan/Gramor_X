// types/certificates.ts
// Types for certificates issued after challenge completion
import type { ApiResult } from "./api";

export interface CertificateMeta {
  band?: number; // e.g. 7.5
  cohort?: string;
  issuedBy?: string;
  issuedAt?: string; // ISO date
  notes?: string;
}

export interface Certificate {
  id: string;
  userId: string;
  enrollmentId?: string;
  imageUrl: string;
  meta: CertificateMeta;
  createdAt: string; // ISO timestamp
}

// API contracts

// Create certificate
export interface CertificateCreateRequest {
  enrollmentId: string;
  band: number;
}
export type CertificateCreateResponse = ApiResult<{ certificate: Certificate }>;

// Sign certificate
export interface CertificateSignRequest {
  certId: string;
}
export type CertificateSignResponse = ApiResult<{ signedUrl: string }>;
