import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { TimeSlotService } from '../services/timeSlot.service';
import { timeSlotProfileService } from '../services/timeSlotProfile.service';
import type {
  TimeSlot,
  TimeSlotProfile,
  TimeSlotPayload,
  TimeSlotProfilePayload,
  TimeSlotFilter,
  DayOfWeek,
  GenerateTimeSlotPayload,
  DuplicateProfilePayload,
} from '../types/timeSlot';

export const useTimeSlotStore = defineStore('timeSlot', () => {
  // State Master Profil
  const profiles = ref<TimeSlotProfile[]>([]);
  const activeProfileId = ref<number | null>(null);
  const isLoadingProfiles = ref<boolean>(false);

  // State Slot Waktu
  const timeSlots = ref<TimeSlot[]>([]);
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const filters = reactive<TimeSlotFilter>({
    time_slot_profile_id: null,
    day: '',
    is_break: '' as any,
  });

  // Getter Profil Aktif
  const activeProfile = computed(() => {
    return profiles.value.find((p) => p.id === activeProfileId.value) || null;
  });

  // --- METODE MASTER PROFIL SLOT WAKTU ---

  const fetchProfiles = async (academicYearId?: number) => {
    isLoadingProfiles.value = true;
    errorMessage.value = null;

    try {
      const response = await timeSlotProfileService.getAll(academicYearId);
      if (response.status === 'success' && response.data) {
        profiles.value = response.data;

        if (profiles.value.length > 0 && !activeProfileId.value) {
          const defaultProf = profiles.value.find((p) => p.is_default) || profiles.value[0];
          await setActiveProfile(defaultProf.id);
        } else if (activeProfileId.value) {
          await fetchTimeSlots();
        }
      } else {
        errorMessage.value = response.message || 'Gagal memuat profil slot waktu.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat profil slot waktu.';
    } finally {
      isLoadingProfiles.value = false;
    }
  };

  const setActiveProfile = async (profileId: number) => {
    activeProfileId.value = profileId;
    filters.time_slot_profile_id = profileId;
    await fetchTimeSlots();
  };

  const createProfile = async (payload: TimeSlotProfilePayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await timeSlotProfileService.create(payload);
      if (response.status === 'success' && response.data) {
        successMessage.value = response.message || 'Profil berhasil ditambahkan.';
        profiles.value.push(response.data);
        await setActiveProfile(response.data.id);
        return { success: true, data: response.data };
      }
      errorMessage.value = response.message || 'Gagal menambahkan profil.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan profil.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateProfile = async (id: number, payload: TimeSlotProfilePayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const response = await timeSlotProfileService.update(id, payload);
      if (response.status === 'success' && response.data) {
        successMessage.value = response.message || 'Profil berhasil diperbarui.';
        const idx = profiles.value.findIndex((p) => p.id === id);
        if (idx !== -1) {
          const oldProfile = profiles.value[idx];
          const updated = response.data;
          
          profiles.value[idx] = {
            ...oldProfile,
            ...updated,
            classes_count:
              updated.classes_count ??
              updated.classes?.length ??
              oldProfile.classes_count,
            classes: updated.classes ?? oldProfile.classes,
          };
        }
        return { success: true, data: response.data };
      }
      errorMessage.value = response.message || 'Gagal memperbarui profil.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui profil.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteProfile = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await timeSlotProfileService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Profil berhasil dihapus.';
        profiles.value = profiles.value.filter((p) => p.id !== id);

        if (activeProfileId.value === id) {
          activeProfileId.value = profiles.value[0]?.id || null;
          if (activeProfileId.value) {
            await fetchTimeSlots();
          } else {
            timeSlots.value = [];
          }
        }
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus profil.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus profil.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const assignProfileToClasses = async (profileId: number, classIds: number[]) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await timeSlotProfileService.assignToClasses(profileId, { class_ids: classIds });
      if (response.status === 'success') {
        successMessage.value = response.message || 'Kelas berhasil dihubungkan ke profil.';
        await fetchProfiles();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghubungkan kelas.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghubungkan kelas.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const duplicateProfile = async (profileId: number, payload: DuplicateProfilePayload) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await timeSlotProfileService.duplicate(profileId, payload);
      if (response.status === 'success' && response.data) {
        successMessage.value = response.message || 'Profil berhasil diduplikasi.';
        await fetchProfiles(payload.target_academic_year_id);
        await setActiveProfile(response.data.id);
        return { success: true, data: response.data };
      }
      errorMessage.value = response.message || 'Gagal menduplikasi profil.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menduplikasi profil.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  // --- METODE DETAIL SLOT WAKTU ---

  const fetchTimeSlots = async () => {
    if (!activeProfileId.value) {
      timeSlots.value = [];
      return;
    }

    isLoading.value = true;
    errorMessage.value = null;

    try {
      filters.time_slot_profile_id = activeProfileId.value;
      const response = await TimeSlotService.getAll(filters);
      if (response.status === 'success' && response.data) {
        timeSlots.value = response.data;
      } else {
        errorMessage.value = response.message || 'Gagal memuat data slot waktu.';
      }
    } catch (error: any) {
      errorMessage.value = error.message || 'Gagal memuat data slot waktu.';
    } finally {
      isLoading.value = false;
    }
  };

  const createTimeSlot = async (payload: TimeSlotPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const finalPayload: TimeSlotPayload = {
        ...payload,
        time_slot_profile_id: payload.time_slot_profile_id || activeProfileId.value!,
      };
      const response = await TimeSlotService.create(finalPayload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Slot waktu berhasil ditambahkan.';
        await fetchTimeSlots();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menambahkan slot waktu.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menambahkan slot waktu.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const updateTimeSlot = async (id: number, payload: TimeSlotPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const finalPayload: TimeSlotPayload = {
        ...payload,
        time_slot_profile_id: payload.time_slot_profile_id || activeProfileId.value!,
      };
      const response = await TimeSlotService.update(id, finalPayload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Slot waktu berhasil diperbarui.';
        await fetchTimeSlots();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal memperbarui slot waktu.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal memperbarui slot waktu.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteTimeSlot = async (id: number) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await TimeSlotService.delete(id);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Slot waktu berhasil dihapus.';
        await fetchTimeSlots();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal menghapus slot waktu.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal menghapus slot waktu.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const deleteTimeSlotsByDay = async (day: DayOfWeek) => {
    isSaving.value = true;
    errorMessage.value = null;

    try {
      const response = await TimeSlotService.deleteByDay(day, activeProfileId.value);
      if (response.status === 'success') {
        successMessage.value = response.message || `Seluruh slot waktu di hari ${day} berhasil dihapus.`;
        await fetchTimeSlots();
        return { success: true };
      }
      errorMessage.value = response.message || `Gagal menghapus slot waktu di hari ${day}.`;
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || `Gagal menghapus slot waktu di hari ${day}.`;
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const generateTimeSlots = async (payload: GenerateTimeSlotPayload) => {
    isSaving.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    try {
      const finalPayload: GenerateTimeSlotPayload = {
        ...payload,
        time_slot_profile_id: payload.time_slot_profile_id || activeProfileId.value!,
      };
      const response = await TimeSlotService.generate(finalPayload);
      if (response.status === 'success') {
        successMessage.value = response.message || 'Slot waktu berhasil di-generate secara otomatis.';
        await fetchTimeSlots();
        return { success: true };
      }
      errorMessage.value = response.message || 'Gagal meng-generate slot waktu.';
      return { success: false, message: response.message };
    } catch (error: any) {
      const msg = error.message || 'Gagal meng-generate slot waktu.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } finally {
      isSaving.value = false;
    }
  };

  const resetFilters = () => {
    filters.day = '';
    filters.is_break = '' as any;
    fetchTimeSlots();
  };

  return {
    profiles,
    activeProfileId,
    activeProfile,
    isLoadingProfiles,
    timeSlots,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    filters,
    fetchProfiles,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    assignProfileToClasses,
    duplicateProfile,
    fetchTimeSlots,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    deleteTimeSlotsByDay,
    generateTimeSlots,
    resetFilters,
  };
});