import { defineStore } from 'pinia';
import { ref } from 'vue';
import { GradeService } from '../services/grade.service';
import type { Grade, GradePayload } from '../types/grade';

export const useGradeStore = defineStore('grade', () => {
  const grades = ref<Grade[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const searchQuery = ref<string>('');
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const fetchGrades = async () => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await GradeService.getAll(searchQuery.value);
      if (response.status === 'success' && response.data) {
        grades.value = response.data;
      } else {
        errorMessage.value = response.message || 'Gagal memuat data jenjang.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat data jenjang.';
    } finally {
      isLoading.value = false;
    }
  };

  const createGrade = async (payload: GradePayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await GradeService.create(payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Jenjang berhasil ditambahkan.';
        await fetchGrades();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menambahkan jenjang.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan jenjang.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateGrade = async (id: number, payload: GradePayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await GradeService.update(id, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Jenjang berhasil diperbarui.';
        await fetchGrades();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui jenjang.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui jenjang.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteGrade = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await GradeService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Jenjang berhasil dihapus.';
        await fetchGrades();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus jenjang.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus jenjang.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  return {
    grades,
    isLoading,
    isSaving,
    searchQuery,
    errorMessage,
    successMessage,
    fetchGrades,
    createGrade,
    updateGrade,
    deleteGrade,
  };
});