import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { ToastMessage } from '@/types';

/** Pure client/UI state: sidebar, mobile nav and the toast queue. */
export interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toasts: ToastMessage[];
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileNavOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    pushToast(
      state,
      action: PayloadAction<{
        title: string;
        description?: string;
        variant?: ToastMessage['variant'];
        durationMs?: number;
      }>,
    ) {
      state.toasts.push({
        id: nanoid(),
        title: action.payload.title,
        description: action.payload.description,
        variant: action.payload.variant ?? 'success',
        durationMs: action.payload.durationMs,
      });
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setMobileNavOpen,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
