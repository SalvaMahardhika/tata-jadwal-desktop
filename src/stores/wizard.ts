import { defineStore } from 'pinia';
import { ref } from 'vue';
import { WizardService } from '../services/wizard.service';
import type { 
  ClassMatrixData, 
  TeacherMatrixData, 
  MasterMatrixData, 
  TimeSlot,
  LockSlotPayload,
  ManualAssignPayload,
  ClearSlotPayload
} from '../types/wizard';

export type WizardViewMode = 'class' | 'teacher' | 'master';

export const useWizardStore = defineStore('wizard', () => {
  const viewMode = ref<WizardViewMode>('class');
  const selectedAcademicYearId = ref<number | null>(null);
  const selectedClassId = ref<number | null>(null);
  const selectedTeacherId = ref<number | null>(null);
  
  // Dibuat null secara default agar dinamis mengikuti slot profil waktu kelas yang terdaftar.
  const maxPeriodNumber = ref<number | null>(null); 

  const timeSlots = ref<TimeSlot[]>([]);
  const classMatrix = ref<ClassMatrixData | null>(null);
  const teacherMatrix = ref<TeacherMatrixData | null>(null);
  const masterMatrix = ref<MasterMatrixData | null>(null);

  const isLoading = ref<boolean>(false);
  const isProcessing = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const fetchClassMatrix = async (classId: number) => {
    if (!classId) return;
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.getClassMatrix(classId, selectedAcademicYearId.value || undefined);
      if (response.status === 'success' && response.data) {
        classMatrix.value = response.data;
        timeSlots.value = response.data.time_slots || [];
      } else {
        errorMessage.value = response.message || 'Gagal memuat matriks jadwal kelas.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat matriks jadwal kelas.';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchTeacherMatrix = async (teacherId: number) => {
    if (!teacherId || !selectedAcademicYearId.value) return;
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.getTeacherMatrix(teacherId, selectedAcademicYearId.value);
      if (response.status === 'success' && response.data) {
        teacherMatrix.value = response.data;
        timeSlots.value = response.data.time_slots || [];
      } else {
        errorMessage.value = response.message || 'Gagal memuat matriks jadwal guru.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat matriks jadwal guru.';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchMasterMatrix = async () => {
    if (!selectedAcademicYearId.value) return;
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.getMasterMatrix(selectedAcademicYearId.value);
      if (response.status === 'success' && response.data) {
        masterMatrix.value = response.data;
        timeSlots.value = response.data.time_slots || [];
      } else {
        errorMessage.value = response.message || 'Gagal memuat matriks jadwal master.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat matriks jadwal master.';
    } finally {
      isLoading.value = false;
    }
  };

  const refreshCurrentView = async () => {
    if (viewMode.value === 'class' && selectedClassId.value) {
      await fetchClassMatrix(selectedClassId.value);
    } else if (viewMode.value === 'teacher' && selectedTeacherId.value) {
      await fetchTeacherMatrix(selectedTeacherId.value);
    } else if (viewMode.value === 'master') {
      await fetchMasterMatrix();
    }
  };

  const generateSchedule = async (classIdOnly?: number | null) => {
    if (!selectedAcademicYearId.value) return { success: false, message: 'Tahun ajaran belum dipilih.' };
    
    isProcessing.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await WizardService.generate({
        academic_year_id: selectedAcademicYearId.value,
        class_id: classIdOnly,
        max_period_number: maxPeriodNumber.value, // Otomatis bernilai null jika tidak dibatasi
      });

      if (response.status === 'success') {
        const unplaced = response.data?.unplaced_count || 0;
        if (unplaced > 0) {
          successMessage.value = `Auto-generate selesai dengan ${unplaced} jam pelajaran yang belum mendapatkan slot.`;
        } else {
          successMessage.value = 'Auto-generate jadwal berhasil diselesaikan secara sempurna!';
        }
        await refreshCurrentView();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal melakukan auto-generate jadwal.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal melakukan auto-generate jadwal.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isProcessing.value = false;
    }
  };

  const lockSlot = async (payload: LockSlotPayload) => {
    isProcessing.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.lockSlot(payload);
      if (response.status === 'success') {
        successMessage.value = 'Status kuncian slot berhasil diperbarui.';
        await refreshCurrentView();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal mengunci slot.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal mengunci slot.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isProcessing.value = false;
    }
  };

  const manualAssign = async (payload: ManualAssignPayload) => {
    isProcessing.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.manualAssign(payload);
      if (response.status === 'success') {
        successMessage.value = 'Jadwal berhasil diperbarui secara manual.';
        await refreshCurrentView();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal melakukan penempatan manual.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal melakukan penempatan manual.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isProcessing.value = false;
    }
  };

  const clearSlot = async (payload: ClearSlotPayload) => {
    isProcessing.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.clearSlot(payload);
      if (response.status === 'success') {
        successMessage.value = 'Slot jadwal berhasil dikosongkan.';
        await refreshCurrentView();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal mengosongkan slot.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal mengosongkan slot.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isProcessing.value = false;
    }
  };

  const resetSchedule = async (classIdOnly?: number | null) => {
    if (!selectedAcademicYearId.value) return { success: false, message: 'Tahun ajaran belum dipilih.' };

    isProcessing.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.reset({
        academic_year_id: selectedAcademicYearId.value,
        class_id: classIdOnly,
      });

      if (response.status === 'success') {
        successMessage.value = response.message || 'Jadwal yang tidak dikunci berhasil di-reset.';
        await refreshCurrentView();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal mereset jadwal.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal mereset jadwal.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isProcessing.value = false;
    }
  };

  const publishSchedule = async (classIdOnly?: number | null) => {
    if (!selectedAcademicYearId.value) return { success: false, message: 'Tahun ajaran belum dipilih.' };

    isProcessing.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.publish({
        academic_year_id: selectedAcademicYearId.value,
        class_id: classIdOnly,
      });

      if (response.status === 'success') {
        successMessage.value = response.message || 'Jadwal berhasil dipublikasikan.';
        await refreshCurrentView();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal mempublikasikan jadwal.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal mempublikasikan jadwal.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isProcessing.value = false;
    }
  };

  const unpublishSchedule = async (classIdOnly?: number | null) => {
    if (!selectedAcademicYearId.value) return { success: false, message: 'Tahun ajaran belum dipilih.' };

    isProcessing.value = true;
    errorMessage.value = null;

    try {
      const response = await WizardService.unpublish({
        academic_year_id: selectedAcademicYearId.value,
        class_id: classIdOnly,
      });

      if (response.status === 'success') {
        successMessage.value = response.message || 'Jadwal berhasil dikembalikan menjadi draft.';
        await refreshCurrentView();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal mengembalikan jadwal ke draft.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal mengembalikan jadwal ke draft.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isProcessing.value = false;
    }
  };

  return {
    viewMode,
    selectedAcademicYearId,
    selectedClassId,
    selectedTeacherId,
    maxPeriodNumber,
    timeSlots,
    classMatrix,
    teacherMatrix,
    masterMatrix,
    isLoading,
    isProcessing,
    errorMessage,
    successMessage,
    fetchClassMatrix,
    fetchTeacherMatrix,
    fetchMasterMatrix,
    refreshCurrentView,
    generateSchedule,
    lockSlot,
    manualAssign,
    clearSlot,
    resetSchedule,
    publishSchedule,
    unpublishSchedule,
  };
});