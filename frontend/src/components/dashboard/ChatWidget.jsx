import React, { useEffect, useRef } from 'react'
import useStore from '@/store/useStore'
import { PulseDot } from '@/components/ui'

export default function ChatWidget() {
  const { chatOpen, chatMessages, chatInput, chatLoading, toggleChat, setChatInput, sendChat } = useStore()
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages, chatLoading])

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 200 }}>
      {/* Chat window */}
      {chatOpen && (
        <div style={{
          width: 340, height: 480, background: 'var(--bg-1)',
          border: '1px solid var(--border)', borderRadius: 18,
          display: 'flex', flexDirection: 'column', marginBottom: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,.7)',
          animation: 'slideUp .25s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,var(--green),var(--blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>FINARA Asistan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--green)' }}>
                <PulseDot />Çevrimiçi
              </div>
            </div>
            <button onClick={toggleChat} style={{ marginLeft: 'auto', color: 'var(--t3)', fontSize: 15, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{
                  borderRadius: m.role === 'user' ? '11px 11px 3px 11px' : '11px 11px 11px 3px',
                  padding: '7px 11px', fontSize: 11, lineHeight: 1.6,
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg,var(--green),#00b07a)'
                    : 'var(--bg-2)',
                  color: m.role === 'user' ? '#050d1a' : 'var(--t1)',
                  fontWeight: m.role === 'user' ? 500 : 400,
                  border: m.role === 'ai' ? '1px solid var(--border)' : 'none',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <div style={{
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: '11px 11px 11px 3px', padding: '8px 12px',
                  display: 'flex', gap: 4,
                }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
                      animation: `typingBounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '9px 11px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, alignItems: 'center' }}>
            <div style={{
              flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 10px', display: 'flex',
            }}>
              <input
                style={{ flex: 1, fontSize: 12, background: 'none', border: 'none', outline: 'none', color: 'var(--t1)' }}
                placeholder="Sorunuzu yazın…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
            </div>
            <button onClick={sendChat} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,var(--green),var(--blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            }}>➤</button>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button onClick={toggleChat} style={{
        width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,var(--green),var(--blue))',
        boxShadow: '0 4px 20px var(--gg)', fontSize: 20, float: 'right',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform .2s',
      }}>
        {chatOpen ? '✕' : '💬'}
      </button>
    </div>
  )
}
