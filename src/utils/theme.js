import { useAppStore } from '@/stores/app'

export function useTheme() {
  const appStore = useAppStore()
  return {
    isDark: appStore.isDarkMode,
    toggle: appStore.toggleDarkMode
  }
}

export function getCSSVariable(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
