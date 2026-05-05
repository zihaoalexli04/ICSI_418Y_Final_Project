import type { AdvisorStudentRecord } from "@/frontend/lib/session";
import {
  creditsFor,
  getCourseById,
  getFourYearPlanCourseCodeById,
  getFourYearPlanCourseIdsForMajor,
  majorCourseIds,
  normalizeCourseId,
} from "@/shared/site-data";

const DEGREE_TOTAL_CREDITS = 120;

function uniqueCourseIds(courseIds: string[]) {
  return Array.from(
    new Set(
      courseIds
        .map((courseId) => normalizeCourseId(courseId))
        .filter(Boolean),
    ),
  );
}

export function getMajorCourseIdsForStudent(major: string, addedCourseIds: string[] = []) {
  const planCourseIds = getFourYearPlanCourseIdsForMajor(major);
  return uniqueCourseIds([...(planCourseIds.length > 0 ? planCourseIds : majorCourseIds), ...addedCourseIds]);
}

export function buildStudentCourseProgress(student: AdvisorStudentRecord) {
  const selectedCourseIds = uniqueCourseIds([
    ...(student.selectedCourseIds ?? []),
    ...(student.semesterOneCourseIds ?? []),
    ...(student.semesterTwoCourseIds ?? []),
  ]);
  const majorCourseIdsForStudent = getMajorCourseIdsForStudent(student.major, student.majorAddedCourseIds ?? []);
  const majorCourseIdSet = new Set(majorCourseIdsForStudent);
  const selectedMajorCourseIds = selectedCourseIds.filter((courseId) => majorCourseIdSet.has(courseId));
  const selectedElectiveCourseIds = selectedCourseIds.filter((courseId) => !majorCourseIdSet.has(courseId));
  const totalCredits = selectedCourseIds.reduce((sum, courseId) => sum + creditsFor(courseId), 0);
  const majorCredits = selectedMajorCourseIds.reduce((sum, courseId) => sum + creditsFor(courseId), 0);
  const electiveCredits = selectedElectiveCourseIds.reduce((sum, courseId) => sum + creditsFor(courseId), 0);
  const majorCompletionPercent =
    majorCourseIdsForStudent.length > 0
      ? Math.round((selectedMajorCourseIds.length / majorCourseIdsForStudent.length) * 100)
      : 0;

  return {
    selectedCourseIds,
    selectedMajorCourseIds,
    selectedElectiveCourseIds,
    majorCourseCount: majorCourseIdsForStudent.length,
    totalCredits,
    majorCredits,
    electiveCredits,
    degreeTotalCredits: DEGREE_TOTAL_CREDITS,
    majorCompletionPercent,
  };
}

export function formatCourseDisplay(courseId: string) {
  const normalizedCourseId = normalizeCourseId(courseId);
  const course = getCourseById(normalizedCourseId);
  const code = getFourYearPlanCourseCodeById(normalizedCourseId) ?? course?.code ?? normalizedCourseId;
  return course ? `${code} ${course.title}` : code;
}
