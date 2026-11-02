import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { SubjectService } from '../services/subject.service';
import type { Subject, SubjectPayload, SubjectFilter } from '../types/subject';

export const useSubjectStore = defineStore('subject', () => {
  const subjects = ref<Subject[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const filters = reactive<SubjectFilter>({
    search: '',
    category: '',
    status: '',
    is_joint_subject: '' as any,
  });

  const fetchSubjects = async () => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await SubjectService.getAll(filters);
      if (response.status === 'success' && response.data) {
        subjects.value = response.data;
      } else {
        errorMessage.value = response.message || 'Gagal memuat data mata pelajaran.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat data mata pelajaran.';
    } finally {
      isLoading.value = false;
    }
  };

  const createSubject = async (payload: SubjectPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await SubjectService.create(payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Mata pelajaran berhasil ditambahkan.';
        await fetchSubjects();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menambahkan mata pelajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan mata pelajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateSubject = async (id: number, payload: SubjectPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await SubjectService.update(id, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Mata pelajaran berhasil diperbarui.';
        await fetchSubjects();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui mata pelajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui mata pelajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteSubject = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await SubjectService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Mata pelajaran berhasil dihapus.';
        await fetchSubjects();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus mata pelajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus mata pelajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const resetFilters = () => {
    filters.search = '';
    filters.category = '';
    filters.status = '';
    filters.is_joint_subject = '' as any;
    fetchSubjects();
  };

  return {
    subjects,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    filters,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    resetFilters,
  };
});