import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCache, setCache } from '@/utils/cache'

const FAVORITES_KEY = 'user_favorites'

export const useUserStore = defineStore('user', () => {
  const favorites = ref(getCache(FAVORITES_KEY) || [])

  const favoriteBonds = computed(() => favorites.value.filter(f => f.type === 'convertible'))
  const favoriteLof = computed(() => favorites.value.filter(f => f.type === 'lof'))
  const favoriteIpos = computed(() => favorites.value.filter(f => f.type === 'hkipo'))

  function isFavorite(type, code) {
    return favorites.value.some(f => f.type === type && f.code === code)
  }

  function toggleFavorite(type, code, name = '') {
    const idx = favorites.value.findIndex(f => f.type === type && f.code === code)
    if (idx > -1) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push({ type, code, name, addedAt: Date.now() })
    }
    setCache(FAVORITES_KEY, favorites.value)
  }

  function removeFavorite(type, code) {
    const idx = favorites.value.findIndex(f => f.type === type && f.code === code)
    if (idx > -1) {
      favorites.value.splice(idx, 1)
      setCache(FAVORITES_KEY, favorites.value)
    }
  }

  return { favorites, favoriteBonds, favoriteLof, favoriteIpos, isFavorite, toggleFavorite, removeFavorite }
})
