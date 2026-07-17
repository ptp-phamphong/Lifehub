/** Hình thức học do portal UEH trả về. NGHỈ = buổi nghỉ, không phải buổi học. */
export type LearningMode = 'TẬP TRUNG' | 'ONLINE' | 'LMS' | 'NGHỈ';

export class CourseSchedule {
    id?: number;
    courseName?: string;
    courseCode?: string;
    /** Bằng sessionDate — mỗi bản ghi là một buổi học của một ngày cụ thể. */
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    room?: string;
    address?: string;
    semesterMetadataId?: number;
    semesterName?: string;
    semesterYear?: number;
    dayOfWeek?: number;
    /** Ngày chính xác của buổi học. */
    sessionDate?: string;
    weekOfYear?: number;
    displayWeek?: number;
    startPeriod?: number;
    endPeriod?: number;
    classCode?: string;
    lecturer?: string;
    lecturerEmail?: string;
    learningMode?: LearningMode | string;
    language?: string;
    createdDate?: string;
}
