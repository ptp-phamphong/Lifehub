export interface CourseSchedule {
  id?: number;
  courseName?: string;
  courseCode?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  semesterMetadataId?: number;
  semesterName?: string;
  semesterYear?: number;
  dayOfWeek?: number;
  createdDate?: string;
}
