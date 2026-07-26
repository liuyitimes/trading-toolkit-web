import { defineStore } from 'pinia'
import { ref } from 'vue'
import { quoteManager } from '@/utils/quoteManager'

export const useQuoteStore = defineStore('quote', () => {
  const quotes = ref(quoteManager.getQuotes())
  const isBarrageVisible = ref(true)

  function refreshQuotes() {
    quotes.value = quoteManager.getQuotes()
  }

  function addQuote(text, author) {
    const saved = quoteManager.addQuote(text, author)
    if (saved) refreshQuotes()
    return saved
  }

  function updateQuote(index, text, author) {
    const saved = quoteManager.updateQuote(index, text, author)
    if (saved) refreshQuotes()
    return saved
  }

  function deleteQuote(index) {
    const saved = quoteManager.deleteQuote(index)
    if (saved) refreshQuotes()
    return saved
  }

  function resetToDefault() {
    const saved = quoteManager.resetToDefault()
    if (saved) refreshQuotes()
    return saved
  }

  function closeBarrage() {
    isBarrageVisible.value = false
  }

  return {
    quotes,
    isBarrageVisible,
    addQuote,
    updateQuote,
    deleteQuote,
    resetToDefault,
    closeBarrage
  }
})
