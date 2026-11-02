import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { ClassService } from '../services/class.service';
import type { ClassItem, ClassPayload, ClassFilter } from '../types/class';

export const useClassStore = defineStore('class', () => {
  const classes = ref<ClassItem[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const filters = reactive<ClassFilter>({
    search: '',
    academic_year_id: '' as any,
    grade_id: '' as any,
    status: '',
  });

  const fetchClasses = async () => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await ClassService.getAll(filters);
      if (response.status === 'success' && response.data) {
        classes.value = response.data;
      } else {
        errorMessage.value = response.message || 'Gagal memuat data kelas.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat data kelas.';
    } finally {
      isLoading.value = false;
    }
  };

  const createClass = async (payload: ClassPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await ClassService.create(payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Kelas berhasil ditambahkan.';
        await fetchClasses();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menambahkan kelas.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan kelas.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateClass = async (id: number, payload: ClassPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await ClassService.update(id, payload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Kelas berhasil diperbarui.';
        await fetchClasses();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui kelas.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui kelas.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteClass = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await ClassService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Kelas berhasil dihapus.';
        await fetchClasses();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus kelas.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus kelas.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const resetFilters = () => {
    filters.search = '';
    filters.academic_year_id = '' as any;
    filters.grade_id = '' as any;
    filters.status = '';
    fetchClasses();
  };

  return {
    classes,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    filters,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    resetFilters,
  };
});