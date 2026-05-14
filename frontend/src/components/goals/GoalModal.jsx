import React from 'react'
import useStore from '@/store/useStore'
import { Modal, InputField, Button } from '@/components/ui'

export default function GoalModal() {
  const { goalForm, setGoalForm, addGoal, closeGoalModal } = useStore()

  return (
    <Modal title="Yeni Hedef Oluştur" onClose={closeGoalModal}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 10 }}>
        <InputField label="Hedef Adı" placeholder="Ev Almak…"
          value={goalForm.title} onChange={(e) => setGoalForm({ title: e.target.value })} />
        <InputField label="Emoji" value={goalForm.emoji}
          onChange={(e) => setGoalForm({ emoji: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <InputField label="Hedef Tutar (₺)" type="number" placeholder="50000"
          value={goalForm.target_amount} onChange={(e) => setGoalForm({ target_amount: e.target.value })} />
        <InputField label="Mevcut Birikim (₺)" type="number" placeholder="0"
          value={goalForm.saved_amount} onChange={(e) => setGoalForm({ saved_amount: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <InputField label="Kategori" placeholder="Tatil, Araç…"
          value={goalForm.category} onChange={(e) => setGoalForm({ category: e.target.value })} />
        <InputField label="Son Tarih" type="date"
          value={goalForm.deadline} onChange={(e) => setGoalForm({ deadline: e.target.value })} />
      </div>
      <Button variant="primary" onClick={() => void addGoal()} style={{ width: '100%', justifyContent: 'center', height: 40 }}>
        Hedef Oluştur
      </Button>
    </Modal>
  )
}
