import React from 'react'
import useStore from '@/store/useStore'
import { Modal, InputField, Button } from '@/components/ui'

export default function BillModal() {
  const { billForm, setBillForm, addBill, closeBillModal } = useStore()
  return (
    <Modal title="Fatura Ekle" onClose={closeBillModal}>
      <div style={{ marginBottom: 10 }}>
        <InputField label="Fatura Adı" placeholder="Elektrik, Netflix…"
          value={billForm.name} onChange={(e) => setBillForm({ name: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <InputField label="Tutar (₺)" type="number" placeholder="250"
          value={billForm.amount} onChange={(e) => setBillForm({ amount: e.target.value })} />
        <InputField label="Ödeme Günü (1-31)" type="number" min={1} max={31} placeholder="15"
          value={billForm.due_day} onChange={(e) => setBillForm({ due_day: e.target.value })} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <InputField label="Kategori" placeholder="Enerji, İletişim…"
          value={billForm.category} onChange={(e) => setBillForm({ category: e.target.value })} />
      </div>
      <Button variant="primary" onClick={() => void addBill()} style={{ width: '100%', justifyContent: 'center', height: 40 }}>
        Fatura Ekle
      </Button>
    </Modal>
  )
}
