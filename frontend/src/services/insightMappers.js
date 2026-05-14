/**
 * Backend user-insights yanıtını Health sayfası şemasına dönüştürür.
 */
export function mapInsightsToHealth(ins) {
  if (!ins) return null
  const score = Math.round(Number(ins.financial_health_score) || 0)
  const level = ins.financial_health_label || '—'
  const sr = Number(ins.savings_rate) || 0
  const savPts = Math.min(25, Math.max(0, Math.round(sr / 2)))
  const risk = ins.risk_status || 'Orta'
  const budgetPts = risk === 'Düşük' ? 22 : risk === 'Orta' ? 15 : 8
  const alerts = Number(ins.active_alerts) || 0
  const fraudPts = Math.max(0, Math.min(20, 20 - alerts * 3))
  const goalAdviceLen = Array.isArray(ins.goal_advice) ? ins.goal_advice.length : 0
  const goalPts = Math.min(15, goalAdviceLen * 4)

  const breakdown = {
    savings: { points: savPts, max: 25, value: `%${sr}` },
    budget: { points: budgetPts, max: 25, violations: risk === 'Yüksek' ? 2 : alerts },
    fraud: { points: fraudPts, max: 20, count: alerts },
    bills: { points: 12, max: 15, on_time: true },
    goals: { points: goalPts, max: 15 },
  }

  const badges = []
  if (score >= 75) {
    badges.push({
      id: 'strong_health',
      title: 'Güçlü Finansal Profil',
      emoji: '🏅',
      description: 'Son dönem gelir-gider dengesi ve sağlık skoru yüksek.',
      color: '#00d68f',
    })
  }
  if (sr >= 15) {
    badges.push({
      id: 'saver',
      title: 'Tasarruf Disiplini',
      emoji: '📈',
      description: `Tasarruf oranı %${sr} seviyesinde.`,
      color: '#3b8bff',
    })
  }
  if (alerts === 0 && ins.credit_score >= 650) {
    badges.push({
      id: 'low_risk',
      title: 'Düşük Risk',
      emoji: '🔒',
      description: 'Aktif fraud uyarısı yok, skor sağlıklı.',
      color: '#9b6dff',
    })
  }

  return { score, level, breakdown, badges }
}

/**
 * advisory_tips + goal_advice → Advisory sayfası kart formatı.
 */
export function mapAdvisoryTips(ins) {
  if (!ins) return []
  const out = []
  const tips = ins.advisory_tips || []
  tips.forEach((msg, i) => {
    out.push({
      type: i === 0 ? 'investment' : 'tip',
      icon: i === 0 ? '💱' : '💡',
      priority: i,
      title: i === 0 ? 'Piyasa & Kur' : 'Öneri',
      message: msg,
      action_label: 'Tamam',
      action_type: 'info',
    })
  })
  const goals = ins.goal_advice || []
  goals.forEach((msg, i) => {
    out.push({
      type: 'goal',
      icon: '🎯',
      priority: 10 + i,
      title: 'Hedef',
      message: msg,
      action_label: 'Hedeflere git',
      action_type: 'view_goal',
    })
  })
  return out
}
