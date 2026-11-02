import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ClassSubjectService } from '../services/classSubject.service';
import type { 
  ClassSubject, 
  AssignClassSubjectPayload, 
  UpdateClassSubjectPayload 
} from '../types/classSubject';
import type { ClassItem } from '../types/class';

export const useClassSubjectStore = defineStore('classSubject', () => {
  const currentClass = ref<ClassItem | null>(null);
  const classSubjects = ref<ClassSubject[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const fetchClassSubjects = async (classId: number) => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await ClassSubjectService.getByClass(classId);
      if (response.status === 'success' && response.data) {
        currentClass.value = response.data.class as ClassItem;
        classSubjects.value = response.data.subjects;
      } else {
        errorMessage.value = response.message || 'Gagal memuat pemetaan mata pelajaran.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat pemetaan mata pelajaran.';
    } finally {
      isLoading.value = false;
    }
  };

  const assignSubject = async (classId: number, payload: AssignClassSubjectPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await ClassSubjectService.assignSubject(classId, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Mata pelajaran berhasil di-assign ke kelas.';
        await fetchClassSubjects(classId);
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal mengalokasikan mata pelajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal mengalokasikan mata pelajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateAssignment = async (id: number, classId: number, payload: UpdateClassSubjectPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await ClassSubjectService.updateAssignment(id, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Pemetaan mapel dan guru berhasil diperbarui.';
        await fetchClassSubjects(classId);
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui pemetaan mapel.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui pemetaan mapel.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteAssignment = async (id: number, classId: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await ClassSubjectService.deleteAssignment(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Pemetaan mapel berhasil dihapus.';
        await fetchClassSubjects(classId);
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus pemetaan mapel.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus pemetaan mapel.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  return {
    currentClass,
    classSubjects,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    fetchClassSubjects,
    assignSubject,
    updateAssignment,
    deleteAssignment,
  };
});