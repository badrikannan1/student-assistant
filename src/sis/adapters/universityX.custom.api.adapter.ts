// src/sis/adapters/universityX.custom.api.adapter.ts
import axios from 'axios';
import { ISisAdapter, StudentSchedule, StudentAward, Appointment } from '../sis.interface';

interface UniversityXApiConfig {
  authToken: string;
  apiEndpoint: string;
}

export class UniversityXCustomApiAdapter implements ISisAdapter {
  private config: UniversityXApiConfig;

  constructor(config: UniversityXApiConfig) {
    this.config = config;
  }

  async getStudentSchedules(studentId: string, term: string): Promise<StudentSchedule[]> {
    // Logic specific to University X's custom API
    const response = await axios.post(
      `${this.config.apiEndpoint}/getSchedules`,
      { studentIdentifier: studentId, academicTerm: term },
      { headers: { Authorization: `Bearer ${this.config.authToken}` } }
    );

    // --- Data Transformation ---
    // Transform University X's API response to StudentSchedule[]
    return response.data.map((customSchedule: any) => ({
      courseId: customSchedule.id,
      courseName: customSchedule.name,
      startTime: customSchedule.beginsAt,
      endTime: customSchedule.endsAt,
      days: customSchedule.onDays,
      location: customSchedule.where,
      instructor: customSchedule.taughtBy,
    }));
  }

  async getStudentAwards(studentId: string): Promise<StudentAward[]> {
    console.warn(`UniversityXCustomApiAdapter: getStudentAwards not fully implemented for studentId: ${studentId}. Returning mock data.`);
    // Return mock data or an empty array for now, as this is a custom API mock.
    return Promise.resolve([]);
  }

  async getAppointments(tenantId: string): Promise<Appointment[]> {
    console.log(`UniversityXCustomApiAdapter: Fetching mock appointments for tenant ${tenantId}`);
    // Simulate API call delay
    // In a real scenario, these would call University X's specific appointment APIs.
    return new Promise(resolve => setTimeout(() => resolve([
      { id: 'ux_appt_a', coachName: 'Prof. Alex Lee (UniversityX)', date: '2024-08-08', time: '01:00 PM', duration: 60 },
      { id: 'ux_appt_b', coachName: 'Dr. Sarah Chen (UniversityX)', date: '2024-08-08', time: '03:30 PM', duration: 30 },
    ]), 600));
  }

  async bookAppointment(appointmentId: string, studentId: string): Promise<{ success: boolean; message: string; }> {
    console.log(`UniversityXCustomApiAdapter: Booking mock appointment ${appointmentId} for student ${studentId}`);
    // Simulate API call and potential failure
    return new Promise((resolve, reject) => setTimeout(() => {
      if (Math.random() > 0.2) { // 80% success rate for this mock
        resolve({ success: true, message: `University X: Appointment (ID: ${appointmentId}) confirmed!` });
      } else {
        reject(new Error("University X: Failed to book appointment. Please try another slot."));
      }
    }, 1200));
  }
}
