import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { MajorService } from '../services/major.service';
import type { Major, MajorPayload, MajorFilter } from '../types/major';

export const useMajorStore = defineStore('major', () => {
  const majors = ref<Major[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const filters = reactive<MajorFilter>({
    search: '',
    status: '',
  });

  const fetchMajors = async () => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await MajorService.getAll(filters);
      if (response.status === 'success' && response.data) {
        majors.value = response.data;
      } else {
        errorMessage.value = response.message || 'Gagal memuat data jurusan.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat data jurusan.';
    } finally {
      isLoading.value = false;
    }
  };

  const createMajor = async (payload: MajorPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await MajorService.create(payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Jurusan berhasil ditambahkan.';
        await fetchMajors();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menambahkan jurusan.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan jurusan.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateMajor = async (id: number, payload: MajorPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await MajorService.update(id, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Jurusan berhasil diperbarui.';
        await fetchMajors();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui jurusan.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui jurusan.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteMajor = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await MajorService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Jurusan berhasil dihapus.';
        await fetchMajors();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus jurusan.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus jurusan.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const resetFilters = () => {
    filters.search = '';
    filters.status = '';
    fetchMajors();
  };

  return {
    majors,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    filters,
    fetchMajors,
    createMajor,
    updateMajor,
    deleteMajor,
    resetFilters,
  };
});