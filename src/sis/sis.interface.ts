// src/sis/sis.interface.ts
export interface StudentSchedule {
  id: string | number;
  courseCode: string;
  courseId: string;
  courseName: string;
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
  days: string[];    // e.g., ['Mon', 'Wed', 'Fri']
  day: string;       // For display, e.g., 'Monday'
  time: string;      // For display, e.g., '10:00 AM - 11:30 AM'
  location: string;
  instructor?: string;
}

export interface StudentAward { // Define a basic interface for student awards
  id: string | number;
  name: string;
  type: string; // e.g., 'Scholarship', 'Grant', 'Loan'
  amount: number;
  status: string; // e.g., 'Awarded', 'Offered', 'Pending'
  awardYear?: string;
  term?: string; // Changed from termName to term
}

export interface Appointment {
  id: string | number;
  coachName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  duration: number; // in minutes
}

export interface ISisAdapter {
  // Authenticate with the SIS if necessary (might be handled internally or explicitly)
  // authenticate(credentials: any): Promise<void>;

  getStudentSchedules(studentId: string, term: string): Promise<StudentSchedule[]>;
  getStudentAwards(studentId: string): Promise<StudentAward[]>;
  getAppointments(tenantId: string): Promise<Appointment[]>;
  bookAppointment(appointmentId: string, studentId: string): Promise<{ success: boolean; message: string; }>;
  // Add other methods like:
  // getCourseDetails(courseId: string): Promise<CourseDetails>;
  // getStudentProfile(studentId: string): Promise<StudentProfile>;
}

// This empty export makes the file a module
export {};
