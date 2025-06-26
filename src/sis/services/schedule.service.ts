// src/services/schedule.service.ts
import { SisAdapterFactory, TenantSisConfig, SisType } from '../sis.adapter.factory';
import { ISisAdapter, StudentSchedule, StudentAward, Appointment } from '../sis.interface';

// Assume you have a way to get the current tenant's SIS config
// This might involve fetching it from a database based on the logged-in user's university
export async function getTenantSisConfiguration(tenantId: string): Promise<TenantSisConfig> {
  // In a real app, fetch this from your database
  // This is a mock implementation
  if (tenantId === 'joyce_uni_id') {
    return {
      sisType: SisType.ANTHOLOGY,
      credentials: {
        applicationKey: process.env.REACT_APP_JOYCE_SIS_ANTHOLOGY_APPLICATION_KEY, // Securely load credentials
        baseUrl: process.env.REACT_APP_JOYCE_SIS_ANTHOLOGY_API_PROXY_URL,
      },
    };
  } else if (tenantId === 'stanford_uni_id') {
    return {
      sisType: SisType.UNIVERSITY_X_CUSTOM,
      credentials: {
        authToken: process.env.REACT_APP_STANFORD_CUSTOM_API_TOKEN,
        apiEndpoint: 'https://api.stanford.edu/custom/v1',
      },
    };
  }
  throw new Error(`No SIS configuration found for tenant ${tenantId}`);
}

export class SisService { // Renamed from ScheduleService to SisService
  private sisAdapter: ISisAdapter;

  constructor(tenantSisConfig: TenantSisConfig) {
    this.sisAdapter = SisAdapterFactory.createAdapter(tenantSisConfig);
  }

  public async getSchedulesForStudent(studentId: string, term: string): Promise<StudentSchedule[]> {
    return this.sisAdapter.getStudentSchedules(studentId, term);
  }

  public async getAwardsForStudent(studentId: string): Promise<StudentAward[]> {
    return this.sisAdapter.getStudentAwards(studentId);
  }

  public async bookAppointmentForStudent(appointmentId: string, studentId: string): Promise<{ success: boolean; message: string; }> {
    return this.sisAdapter.bookAppointment(appointmentId, studentId);
  }

   public async getAppointmentsForTenant(tenantId: string): Promise<Appointment[]> {
    return this.sisAdapter.getAppointments(tenantId);
  }
}

// Example Usage (e.g., in a controller/resolver):
async function handleGetSchedulesRequest(tenantId: string, studentId: string, term: string) {
  try {
    const tenantConfig = await getTenantSisConfiguration(tenantId);
    const scheduleService = new SisService(tenantConfig); // Changed to SisService
    const schedules = await scheduleService.getSchedulesForStudent(studentId, term);
    // return schedules to the client
    console.log(schedules);
  } catch (error) {
    console.error('Error in schedule request:', error);
    // handle error appropriately
  }
}

// handleGetSchedulesRequest('harvard_uni_id', 'student123', 'FALL2024');
// handleGetSchedulesRequest('stanford_uni_id', 'student456', 'FALL2024');
