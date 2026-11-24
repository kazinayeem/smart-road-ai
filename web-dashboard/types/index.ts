export type UserRole = 'CITIZEN' | 'CITY_CORPORATION' | 'CONTRACTOR';

export type ReportStatus =
  | 'NEW'
  | 'NEW_REPORT'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'REPAIR_SUBMITTED'
  | 'CITY_VERIFICATION'
  | 'RESOLVED'
  | 'REJECTED'
  | 'DUPLICATE'
  | 'ASSIGNMENT_DECLINED'
  | 'REPAIR_REJECTED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  username?: string;
  vehicleType?: string;
  phone?: string;
  department?: string;
  companyName?: string;
  createdAt: number;
}

export interface ActivityLogEntry {
  id?: string;
  timestamp: number;
  previousStatus: ReportStatus | null;
  newStatus: ReportStatus;
  changedBy: string;
  changedByUid?: string;
  remarks?: string;
}

export interface PotholeReport {
  id: string;
  reportId?: string;
  reporterId: string;
  reporterName?: string;
  detectionClass?: string; // 'pothole'
  confidence: number;
  areaRatio?: number;
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  priority: PriorityLevel;
  status: ReportStatus;
  source?: 'LIVE_CAMERA' | 'MANUAL_GPS' | 'MOBILE_APP';
  timestamp?: number;
  totalDetections?: number;
  firstDetectedAt?: number;
  lastDetectedAt?: number;
  address?: string;
  contractorId?: string | null;
  assignedTo?: string | null;
  deadline?: number | null;
  notes?: string;
  imageUrl?: string;
  repairBeforeImage?: string;
  repairAfterImage?: string;
  repairNotes?: string;
  createdAt: number;
  updatedAt: number;
  activityLogs?: Record<string, ActivityLogEntry>;
}

export interface Contractor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  active: boolean;
  assignedTasksCount: number;
  completedTasksCount: number;
  rating: number;
}
