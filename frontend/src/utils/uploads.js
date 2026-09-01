const uploadsBaseUrl = (import.meta.env.VITE_UPLOADS_URL || '/uploads').replace(/\/$/, '')

export function uploadUrl(carpeta, archivo) {
  return `${uploadsBaseUrl}/${carpeta}/${archivo}`
}
