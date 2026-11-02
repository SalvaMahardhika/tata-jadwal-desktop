import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { TeacherService } from '../services/teacher.service';
import type { Teacher, TeacherPayload, TeacherFilter } from '../types/teacher';

export const useTeacherStore = defineStore('teacher', () => {
  const teachers = ref<Teacher[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const filters = reactive<TeacherFilter>({
    search: '',
    status: '',
  });

  const fetchTeachers = async () => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await TeacherService.getAll(filters);
      if (response.status === 'success' && response.data) {
        teachers.value = response.data;
      } else {
        errorMessage.value = response.message || 'Gagal memuat data guru.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat data guru.';
    } finally {
      isLoading.value = false;
    }
  };

  const createTeacher = async (payload: TeacherPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await TeacherService.create(payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Data guru berhasil ditambahkan.';
        await fetchTeachers();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menambahkan data guru.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan data guru.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateTeacher = async (id: number, payload: TeacherPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await TeacherService.update(id, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Data guru berhasil diperbarui.';
        await fetchTeachers();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui data guru.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui data guru.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteTeacher = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await TeacherService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Data guru berhasil dihapus.';
        await fetchTeachers();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus data guru.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus data guru.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const resetFilters = () => {
    filters.search = '';
    filters.status = '';
    fetchTeachers();
  };

  return {
    teachers,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    filters,
    fetchTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    resetFilters,
  };
});