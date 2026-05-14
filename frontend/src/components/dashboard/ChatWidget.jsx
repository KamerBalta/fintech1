import React, { useEffect, useRef } from 'react'
import useStore from '@/store/useStore'
import { PulseDot } from '@/components/ui'

export default function ChatWidget() {
  const { chatOpen, chatMessages, chatInput, chatLoading, toggleChat, setChatInput, sendChat } = useStore()
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  useEffect(() => {
    if (chatOpen) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [chatOpen])

  return (
    <div className="fixed right-5 bottom-5 z-[200] flex flex-col items-end gap-3">
      {chatOpen && (
        <div className="flex h-[min(520px,calc(100vh-120px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] shadow-[0_24px_64px_rgba(0,0,0,.72)] animate-[fadeIn_0.2s_ease-out]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-2)]/80 px-4 py-3 backdrop-blur-sm">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{
                background: 'linear-gradient(135deg,var(--green),var(--blue))',
                boxShadow: '0 0 0 1px rgba(255,255,255,.08) inset',
              }}
            >
              ✦
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold tracking-tight text-[var(--t1)]">AI Finansal Asistan</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-[var(--green)]">
                <PulseDot />
                <span>Canlı veri · FINARA</span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleChat}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--t3)] transition hover:bg-[var(--bg-3)] hover:text-[var(--t1)]"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`flex max-w-[92%] ${m.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-md font-medium text-[#041018]'
                      : 'rounded-bl-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--t1)]'
                  }`}
                  style={
                    m.role === 'user'
                      ? { background: 'linear-gradient(135deg,var(--green),#0ea37a)' }
                      : undefined
                  }
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="mr-auto flex max-w-[92%] flex-col gap-1.5 rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--bg-2)] px-3.5 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--t3)]">Yazıyor…</div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block h-2 w-2 rounded-full bg-[var(--green)]"
                      style={{ animation: `typingBounce 1.15s ${i * 0.18}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-[var(--border)] bg-[var(--bg-1)] p-3">
            <div className="flex min-h-[42px] flex-1 items-center rounded-xl border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2 ring-[var(--green)] transition focus-within:border-[var(--border-hi)] focus-within:ring-1">
              <input
                ref={inputRef}
                className="min-h-[22px] w-full bg-transparent text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t3)]"
                placeholder="Örn. Bu ay markete ne kadar harcadım?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChat()
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={sendChat}
              disabled={chatLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold text-[#041018] transition enabled:hover:opacity-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,var(--green),var(--blue))' }}
              aria-label="Gönder"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleChat}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-[22px] shadow-[0_6px_28px_var(--gg)] transition hover:scale-[1.03] active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg,var(--green),var(--blue))' }}
        aria-label={chatOpen ? 'Sohbeti kapat' : 'AI asistanı aç'}
      >
        {chatOpen ? '✕' : '✦'}
      </button>
    </div>
  )
}
