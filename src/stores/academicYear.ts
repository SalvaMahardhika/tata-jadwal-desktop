import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AcademicYearService } from '../services/academicYear.service';
import type { AcademicYear, AcademicYearPayload } from '../types/academicYear';

export const useAcademicYearStore = defineStore('academicYear', () => {
  const academicYears = ref<AcademicYear[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);
  const searchQuery = ref<string>('');

  const fetchAcademicYears = async () => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await AcademicYearService.getAll(searchQuery.value);
      if (response.status === 'success' && response.data) {
        academicYears.value = response.data;
      } else {
        errorMessage.value = response.message || 'Gagal memuat data tahun ajaran.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat data tahun ajaran.';
    } finally {
      isLoading.value = false;
    }
  };

  const createAcademicYear = async (payload: AcademicYearPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await AcademicYearService.create(payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Tahun ajaran berhasil ditambahkan.';
        await fetchAcademicYears();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menambahkan tahun ajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan tahun ajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateAcademicYear = async (id: number, payload: AcademicYearPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await AcademicYearService.update(id, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Tahun ajaran berhasil diperbarui.';
        await fetchAcademicYears();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui tahun ajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui tahun ajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteAcademicYear = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await AcademicYearService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Tahun ajaran berhasil dihapus.';
        await fetchAcademicYears();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus tahun ajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus tahun ajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const setActiveAcademicYear = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await AcademicYearService.setActive(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Tahun ajaran berhasil diaktifkan.';
        await fetchAcademicYears();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal mengaktifkan tahun ajaran.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal mengaktifkan tahun ajaran.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  return {
    academicYears,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    searchQuery,
    fetchAcademicYears,
    createAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    setActiveAcademicYear,
  };
});