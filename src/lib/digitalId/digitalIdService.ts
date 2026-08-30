import { supabase, isSupabaseConfigured } from "../supabase/client";

export type PersonRoleType = "student" | "teacher" | "staff" | "employee";

export type VerificationState = "active" | "inactive" | "expired" | "invalid";

export type VerificationStatusBadgeType = "VERIFIED" | "INACTIVE" | "EXPIRED" | "INVALID";

export interface DigitalIdOrganization {
  name: string;
  academicYear?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface DigitalIdFields {
  // Common / Shared
  studentId?: string;
  employeeId?: string;
  phone?: string;
  emergencyNumber?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  academicYear?: string;
  // Student specific
  class?: string;
  section?: string;
  rollNumber?: string;
  fatherName?: string;
  motherName?: string;
  // Teacher specific
  designation?: string;
  department?: string;
  email?: string;
  joiningDate?: string;
  [key: string]: string | undefined;
}

export interface DigitalIdProfile {
  id: string;
  name: string;
  personType: PersonRoleType;
  status: VerificationState;
  verificationStatus: VerificationStatusBadgeType;
  photoUrl?: string | null;
  organization: DigitalIdOrganization;
  fields: DigitalIdFields;
  verifiedAt: string;
}

export interface DigitalIdVerificationResult {
  success: boolean;
  profile?: DigitalIdProfile;
  error?: "INVALID_IDENTIFIER" | "RECORD_NOT_FOUND" | "NETWORK_ERROR" | "SERVICE_UNAVAILABLE";
  rawStatus?: VerificationState;
}

/**
 * Mask sensitive phone number for public display (e.g. 9876543210 -> ******3210)
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return cleaned;
  return `******${cleaned.slice(-4)}`;
}

/**
 * Format ISO date string into human-friendly format (e.g. 15 Aug 2012)
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Verifies and fetches the digital ID record from Supabase securely via RPC
 * @param identifier Can be Student ID, Employee ID, QR token, or UUID
 */
export async function verifyDigitalId(identifier: string): Promise<DigitalIdVerificationResult> {
  const cleanId = (identifier || "").trim();
  if (!cleanId) {
    return {
      success: false,
      error: "INVALID_IDENTIFIER",
      rawStatus: "invalid",
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "SERVICE_UNAVAILABLE",
      rawStatus: "invalid",
    };
  }

  try {
    const { data, error } = await supabase.rpc("verify_digital_id", {
      p_identifier: cleanId,
    });

    if (error) {
      console.warn("[DigitalIdService] RPC lookup notice:", error.message);
      return {
        success: false,
        error: "RECORD_NOT_FOUND",
        rawStatus: "invalid",
      };
    }

    if (!data || data.status === "invalid" || data.error === "RECORD_NOT_FOUND") {
      return {
        success: false,
        error: "RECORD_NOT_FOUND",
        rawStatus: "invalid",
      };
    }

    // Process valid/inactive/expired profile
    const profile: DigitalIdProfile = {
      id: data.id || cleanId,
      name: data.name || "Identified Individual",
      personType: (data.personType as PersonRoleType) || "student",
      status: (data.status as VerificationState) || "active",
      verificationStatus: (data.verificationStatus as VerificationStatusBadgeType) || "VERIFIED",
      photoUrl: data.photoUrl || null,
      organization: {
        name: data.organization?.name || "Educational Institution",
        academicYear: data.organization?.academicYear || null,
        logoUrl: data.organization?.logoUrl || null,
        website: data.organization?.website || null,
        address: data.organization?.address || null,
        phone: data.organization?.phone || null,
      },
      fields: data.fields || {},
      verifiedAt: data.verifiedAt || new Date().toISOString(),
    };

    return {
      success: true,
      profile,
      rawStatus: profile.status,
    };
  } catch (err: any) {
    console.error("[DigitalIdService] Verification execution failed:", err);
    return {
      success: false,
      error: "NETWORK_ERROR",
      rawStatus: "invalid",
    };
  }
}
