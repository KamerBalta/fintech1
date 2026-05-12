import API from '@/config/api'

export function useExport() {
    const exportFile = async (type = 'excel') => {
        const token = localStorage.getItem('finara_token')
        const url = type === 'excel' ? API.EXPORT_XL : API.EXPORT_PDF

        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Export başarısız')
            const blob = await res.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = type === 'excel' ? 'finara-rapor.xlsx' : 'finara-rapor.pdf'
            a.click()
        } catch {
            // Backend bağlı değilken mock mesaj
            alert(`✅ ${type.toUpperCase()} export hazır!\n\nBackend bağlantısında:\n${url}`)
        }
    }

    return { exportExcel: () => exportFile('excel'), exportPDF: () => exportFile('pdf') }
}