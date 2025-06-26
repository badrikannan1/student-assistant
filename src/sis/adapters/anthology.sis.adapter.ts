// src/sis/adapters/anthology.sis.adapter.ts
import { ISisAdapter, StudentSchedule, StudentAward, Appointment } from '../sis.interface';
import axios from 'axios'; // Or your preferred HTTP client


interface AnthologyApiCredentials {
  applicationKey: string;
  baseUrl: string;
}

export class AnthologySisAdapter implements ISisAdapter {
  private credentials: AnthologyApiCredentials;

  constructor(credentials: AnthologyApiCredentials) {
    this.credentials = credentials;
    // Initialize HTTP client with base URL and auth headers if needed
  }


  async getStudentSchedules(studentId: string, term: string): Promise<StudentSchedule[]> {
    try {
      const activeEnrollmentReponse  = await axios.get(
        `${this.credentials.baseUrl}/api/anthology/StudentEnrollmentPeriods?$filter = StudentId eq ${studentId} and (SchoolStatusId eq 109 or SchoolStatusId eq 7 or SchoolStatusId eq 14 or SchoolStatusId eq 63 or SchoolStatusId eq 70 or SchoolStatusId eq 71 or SchoolStatusId eq 79 or SchoolStatusId eq 88 or SchoolStatusId eq 105 or SchoolStatusId eq 13 or SchoolStatusId eq 15 or SchoolStatusId eq 38 or SchoolStatusId eq 50 or SchoolStatusId eq 67 or SchoolStatusId eq 69 or SchoolStatusId eq 103 or SchoolStatusId eq 104 or SchoolStatusId eq 110 or SchoolStatusId eq 114 or SchoolStatusId eq 118 or SchoolStatusId eq 119)`,
        {
          headers: {
            'Authorization': `ApplicationKey ${this.credentials.applicationKey}`
          }
        }
      );

      // The OData response for enrollments is expected to be in a 'value' array.
      const enrollments = activeEnrollmentReponse.data.value;
      if (!enrollments || enrollments.length === 0) {
        console.warn(`No active enrollment found for studentId: ${studentId}`);
        return []; // No enrollment, so no schedules to fetch.
      }

      const enrollmentId = enrollments[0].Id;
      if (!enrollmentId) {
        throw new Error('Could not find an ID on the first enrollment record.');
      }

      // --- Date Calculation for Schedule Fetch ---
      let startDateStr: string;
      let endDateStr: string;

      // Helper to format a Date object into YYYY-MM-DD string
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // The assistant can pass a dynamic date range via the `term` parameter
      // using the format "DATE_RANGE:YYYY-MM-DD:YYYY-MM-DD".
      if (term && term.startsWith('DATE_RANGE:')) {
        const parts = term.split(':');
        startDateStr = parts[1];
        endDateStr = parts[2];
        console.log(`Using date range from term parameter: ${startDateStr} to ${endDateStr}`);
      } else {
        // By default, get the schedule for the upcoming week (Sunday to Saturday).
        console.log(`Defaulting to next week's schedule. Term was: "${term}"`);
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
        
        // Start of next week (next Sunday)
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek + 7);
        
        // End of next week (next Saturday)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        startDateStr = formatDate(startDate);
        endDateStr = formatDate(endDate);
      }

      const scheduleUrl = new URL(`${this.credentials.baseUrl}/api/anthology/ClassSectionMonthlyScheduleViews/CampusNexus.GetMonthlyClassScheduleView(enrollmentId=${enrollmentId})`);
      scheduleUrl.searchParams.set('startDate', startDateStr);
      scheduleUrl.searchParams.set('endDate', endDateStr);

      const response = await axios.get(
        scheduleUrl.href,
        {
          headers: {
            'Authorization': `ApplicationKey ${this.credentials.applicationKey}`
          }
        }
      );

      // --- Data Transformation ---
      // The raw response from Anthology API will likely be different.
      // You MUST transform it into your standard StudentSchedule[] format.
      const scheduleViews = response.data?.value;
      if (!Array.isArray(scheduleViews)) {
        console.warn('Anthology schedule response is not an array:', response.data);
        return [];
      }

      const getDayOfWeek = (dateString: string) => {
        if (!dateString) return { dayName: 'N/A', dayAbbrs: [] };
        const date = new Date(dateString);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayAbbrs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayIndex = date.getUTCDay();
        return { dayName: dayNames[dayIndex], dayAbbrs: [dayAbbrs[dayIndex]] };
      };

      const formatTimeRange = (start: string, end: string) => {
        if (!start || !end) return 'N/A';
        const format = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${format(start)} - ${format(end)}`;
      };

      return scheduleViews.map((view: any): StudentSchedule => {
        const { dayName, dayAbbrs } = getDayOfWeek(view.MeetingDate);
        const courseCode = view.CourseCode?.trim();
        return {
          id: view.Id,
          courseCode: courseCode,
          courseId: courseCode, // Using courseCode for courseId
          courseName: view.CourseName?.trim(),
          startTime: view.MeetingDateStartTime,
          endTime: view.MeetingDateEndDateTime,
          days: dayAbbrs,
          day: dayName,
          time: formatTimeRange(view.MeetingDateStartTime, view.MeetingDateEndDateTime),
          location: view.RoomName || view.RoomCode || view.RoomNumber || 'Online',
          instructor: view.InstructorName,
        };
      });
    } catch (error) {
      console.error('Error fetching schedules from Anthology:', error);
      // Implement robust error handling and logging
      throw new Error('Failed to retrieve schedules from Anthology SIS.');
    }
  }

  async getStudentAwards(studentId: string): Promise<any[]> {
    try {
      const activeEnrollmentReponse = await axios.get(
        `${this.credentials.baseUrl}/api/anthology/StudentEnrollmentPeriods?$filter = StudentId eq ${studentId} and (SchoolStatusId eq 109 or SchoolStatusId eq 7 or SchoolStatusId eq 14 or SchoolStatusId eq 63 or SchoolStatusId eq 70 or SchoolStatusId eq 71 or SchoolStatusId eq 79 or SchoolStatusId eq 88 or SchoolStatusId eq 105 or SchoolStatusId eq 13 or SchoolStatusId eq 15 or SchoolStatusId eq 38 or SchoolStatusId eq 50 or SchoolStatusId eq 67 or SchoolStatusId eq 69 or SchoolStatusId eq 103 or SchoolStatusId eq 104 or SchoolStatusId eq 110 or SchoolStatusId eq 114 or SchoolStatusId eq 118 or SchoolStatusId eq 119)`,
        {
          headers: {
            'Authorization': `ApplicationKey ${this.credentials.applicationKey}`
          }
        }
      );

      // The OData response for enrollments is expected to be in a 'value' array.
      const enrollments = activeEnrollmentReponse.data.value;
      if (!enrollments || enrollments.length === 0) {
        console.warn(`No active enrollment found for studentId: ${studentId}`);
        return []; // No enrollment, so no schedules to fetch.
      }

      const studentEnrollmentPeriodId = enrollments[0].Id;
      if (!studentEnrollmentPeriodId) {
        throw new Error('Could not find an ID on the first enrollment record.');
      }

      console.log(`Fetching awards for studentEnrollmentPeriodId: ${studentEnrollmentPeriodId}`);
      const awardsResponse = await axios.get( // Prepend /api/anthology to ensure it goes through the proxy
        `${this.credentials.baseUrl}/api/anthology/StudentAwards/CampusNexus.GetStudentViewAwardsDetail(studentId = ${studentId},studentEnrollmentPeriodId = ${studentEnrollmentPeriodId},awardYear = 'ALL',isDoNotDisplayRBSGridChecked = false)?&$format=json&$top=10000&$count=true&$orderby=ScheduledDate asc`,
        {
          headers: {
            'Authorization': `ApplicationKey ${this.credentials.applicationKey}`
          }
        }
      );
      
      const rawAwards = awardsResponse.data?.value;
      console.log("Raw awards response from Anthology:", rawAwards); // Log raw data
      if (!Array.isArray(rawAwards)) {
        console.warn('Anthology awards response is not an array:', awardsResponse.data);
        return [];
      }

      // Helper function to normalize Anthology status to StudentAward status
      const normalizeAwardStatus = (anthologyStatus: string): string => {
        switch (anthologyStatus.toLowerCase()) {
          case 'paid':
          case 'awarded': // If Anthology also uses 'Awarded'
            return 'Awarded';
          case 'offered':
            return 'Offered';
          case 'pending':
          case 'accepted': // Assuming 'Accepted' might be a pending state before 'Paid'
            return 'Pending';
          default:
            return 'Pending'; // Default to pending for unknown statuses
        }
      };

      return rawAwards.map((award: any): StudentAward => ({
        id: award.ScheduledDisbursementId,
        name: award.FundSourceName,
        type: award.FundSourceType,
        amount: award.NetAmount,
        status: normalizeAwardStatus(award.Status), // Use the normalized status
        term: award.TermName?.trim(), // Map TermName to term and trim whitespace
        awardYear: award.AwardYear, // Map AwardYear
      }));
    } catch (error) {
      console.error('Error fetching student awards from Anthology:', error);
      throw new Error('Failed to retrieve student awards from Anthology SIS.');
    }
  }

  async getAppointments(tenantId: string): Promise<Appointment[]> {
    console.log(`AnthologySisAdapter: Fetching mock appointments for tenant ${tenantId}`);
    // Simulate API call delay
    // In a real scenario, this would call Anthology's specific appointment APIs.
    return new Promise(resolve => setTimeout(() => resolve([
      { id: 'appt1', coachName: 'Dr. Emily Carter (Anthology)', date: '2024-08-05', time: '10:00 AM', duration: 30 },
      { id: 'appt2', coachName: 'John Davis (Anthology)', date: '2024-08-05', time: '02:00 PM', duration: 30 },
    ]), 500));
  }

  async bookAppointment(appointmentId: string, studentId: string): Promise<{ success: boolean; message: string; }> {
    console.log(`AnthologySisAdapter: Booking mock appointment ${appointmentId} for student ${studentId}`);
    // Simulate API call and potential failure
    return new Promise((resolve, reject) => setTimeout(() => {
      if (Math.random() > 0.1) { // 90% success rate
        resolve({ success: true, message: `Anthology: Appointment (ID: ${appointmentId}) confirmed!` });
      } else {
        reject(new Error("The selected time slot was just booked by another student. Please select a different time."));
      }
    }, 1000));
  }

  // Implement other ISisAdapter methods...
}
