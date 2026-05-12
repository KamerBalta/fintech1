import React, { useState } from 'react'
import useStore from '@/store/useStore'
import { Button, InputField } from '@/components/ui'

export default function AuthPage() {
    const login = useStore((s) => s.login)
    const [tab, setTab] = useState('login')
    const [form, setForm] = useState({ email: '', password: '', full_name: '' })
    const [err, setErr] = useState('')
    const [loading, setLoading] = useState(false)

    const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const submit = async () => {
        if (!form.email || !form.password) { setErr('E-posta ve şifre zorunludur.'); return }
        setLoading(true); setErr('')
        try { await login({ ...form, isRegister: tab === 'register' }) }
        catch (e) { setErr(e.message) }
        setLoading(false)
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 20% 50%,rgba(0,214,143,.06),transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(59,139,255,.06),transparent 60%),var(--bg-0)',
        }}>
            <div style={{
                width: 420, background: 'var(--bg-1)', border: '1px solid var(--border)',
                borderRadius: 24, padding: 36,
            }}>
                {/* Logo + title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg,var(--green),var(--blue))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 800, color: '#fff',
                    }}>F</div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>FINARA Pro</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>AI Finansal Analiz Platformu v3</div>
                    </div>
                </div>

                {/* Tab switch */}
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-0)', borderRadius: 9, padding: 4, marginBottom: 20 }}>
                    {['login', 'register'].map((t) => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            flex: 1, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: tab === t ? 'var(--bg-2)' : 'transparent',
                            color: tab === t ? 'var(--t1)' : 'var(--t3)', border: 'none', cursor: 'pointer',
                            transition: 'all .2s',
                        }}>{t === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
                    ))}
                </div>

                {err && (
                    <div style={{ background: 'var(--rd)', border: '1px solid rgba(255,77,106,.2)', color: 'var(--red)', borderRadius: 8, padding: '9px 13px', fontSize: 11, marginBottom: 12 }}>
                        ⚠ {err}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {tab === 'register' && (
                        <InputField label="Ad Soyad" placeholder="Ahmet Yılmaz" value={form.full_name} onChange={upd('full_name')} />
                    )}
                    <InputField label="E-posta" type="email" placeholder="ornek@finara.app" value={form.email} onChange={upd('email')} />
                    <InputField label="Şifre" type="password" placeholder="••••••••" value={form.password} onChange={upd('password')}
                        onKeyDown={(e) => e.key === 'Enter' && submit()} />
                </div>

                <Button variant="primary" onClick={submit} disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 13 }}>
                    {loading ? 'İşleniyor…' : tab === 'login' ? 'Giriş Yap →' : 'Hesap Oluştur →'}
                </Button>

                <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--t3)', marginTop: 14 }}>
                    Herhangi bir e-posta & şifre ile demo olarak giriş yapabilirsiniz.
                </p>
            </div>
        </div>
    )
}