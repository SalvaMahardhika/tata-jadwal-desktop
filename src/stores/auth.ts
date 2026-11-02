import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthService } from '../services/auth.service';
import type { User, LoginCredentials } from '../types/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(
    JSON.parse(localStorage.getItem('auth_user') || 'null')
  );
  const token = ref<string | null>(
    localStorage.getItem('auth_token') || null
  );
  const isLoading = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  const setAuth = (userData: User, userToken: string) => {
    user.value = userData;
    token.value = userToken;
    localStorage.setItem('auth_token', userToken);
    localStorage.setItem('auth_user_id', String(userData.id));
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const clearAuth = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user_id');
    localStorage.removeItem('auth_user');
  };

  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await AuthService.login(credentials);
      if (response.status === 'success' && response.data) {
        setAuth(response.data.user, response.data.token);
        return { success: true };
      }
      const msg = response.message || 'Login gagal.';
      errorMessage.value = msg;
      return { success: false, message: msg };
    } catch (error: any) {
      const message = error.message || 'Terjadi kesalahan saat masuk.';
      errorMessage.value = message;
      return { success: false, message };
    } finally {
      isLoading.value = false;
    }
  };

  const fetchUser = async () => {
    if (!token.value) return;

    try {
      const response = await AuthService.me();
      if (response.status === 'success' && response.data) {
        user.value = response.data;
        localStorage.setItem('auth_user', JSON.stringify(response.data));
      } else {
        clearAuth();
      }
    } catch (error) {
      clearAuth();
    }
  };

  const logout = async () => {
    isLoading.value = true;
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      isLoading.value = false;
    }
  };

  return {
    user,
    token,
    isLoading,
    errorMessage,
    isAuthenticated,
    login,
    fetchUser,
    logout,
    clearAuth,
  };
});