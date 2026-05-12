import React from 'react'
import useStore from '@/store/useStore'
import { Modal, SelectField, InputField, Button } from '@/components/ui'

const CATEGORIES = [
  'Market & Gıda', 'Eğlence', 'Alışveriş', 'Yemek',
  'Ulaşım', 'Faturalar', 'Abonelik', 'Sağlık', 'Eğitim',
]

export default function LimitModal() {
  const { limitForm, setLimitForm, saveLimit, closeLimitModal } = useStore()
  return (
    <Modal title="Kategori Limiti Belirle" onClose={closeLimitModal}>
      <div style={{ marginBottom: 10 }}>
        <SelectField label="Kategori"
          value={limitForm.category}
          onChange={(e) => setLimitForm({ category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
      </div>
      <div style={{ marginBottom: 16 }}>
        <InputField label="Aylık Limit (₺)" type="number" placeholder="2000"
          value={limitForm.amount} onChange={(e) => setLimitForm({ amount: e.target.value })} />
      </div>
      <Button variant="primary" onClick={saveLimit} style={{ width: '100%', justifyContent: 'center', height: 40 }}>
        Limiti Kaydet
      </Button>
    </Modal>
  )
}
