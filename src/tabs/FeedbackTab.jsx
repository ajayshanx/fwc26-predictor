import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export default function FeedbackTab() {
  const { user } = useApp()
  const [message,   setMessage]   = useState('')
  const [submitting,setSubmitting]= useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      message: message.trim(),
    })

    setSubmitting(false)
    if (err) {
      setError('Something went wrong — please try again in a moment.')
      return
    }
    setMessage('')
    setSubmitted(true)
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <div className="text-center px-2">
        <h2 className="text-white font-bold text-lg sm:text-xl">💬 Send Feedback</h2>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Spotted a bug, or got an idea that would make this better? Let us know — every
          message goes straight to the team behind the app.
        </p>
      </div>

      <div className="card p-4 sm:p-6">
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-white font-semibold">Thanks for your feedback!</p>
            <p className="text-slate-400 text-sm mt-1">We've received your message.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 text-sm text-gold underline decoration-dotted underline-offset-4"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Your message
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="Tell us what's on your mind…"
                className="w-full bg-navy-600 border border-navy-400 rounded-lg px-4 py-3
                           text-white placeholder-slate-500 text-sm leading-relaxed
                           focus:outline-none focus:border-gold resize-y"
              />
            </div>

            {user && (
              <p className="text-slate-500 text-xs leading-relaxed">
                Sending as <span className="text-slate-300">{user.nickname || user.name}</span>
                {user.email && <> ({user.email})</>} — we may follow up by email if needed.
              </p>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full sm:w-auto bg-gold hover:bg-gold-light text-navy-900 font-bold
                         px-6 py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
