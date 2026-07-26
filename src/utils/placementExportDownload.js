import {
  buildPlacementExportFilename,
  renderPlacementExportDocument
} from './placementExport'

export function downloadPlacementExport(options) {
  const exportedAt = options.exportedAt || new Date()
  const exportOptions = { ...options, exportedAt }
  const blob = new Blob([renderPlacementExportDocument(exportOptions)], {
    type: 'text/markdown;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')

  link.href = url
  link.download = buildPlacementExportFilename(options.candidate, exportedAt)
  link.style.display = 'none'
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
