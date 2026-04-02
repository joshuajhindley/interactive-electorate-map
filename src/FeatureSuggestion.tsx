import React, { useState, type FormEvent } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import './FeatureSuggestion.scss'

interface StaticFormsResponse {
  success: boolean
  message: string
}

const FeatureSuggestion: React.FC = () => {
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('SENDING')

    if (!captchaToken) {
      alert('Please complete the reCAPTCHA first!')
      setStatus('IDLE')
      return
    }

    const formData = new FormData(e.currentTarget)

    const payload = {
      subject: 'Bug Report/Feature Suggestion - NZ Electorate Map',
      email: formData.get('email') as string,
      message: formData.get('message') as string,
      honeypot: formData.get('honeypot') as string,
      'g-recaptcha-response': captchaToken,
      accessKey: 'sf_ef35e5525f14c08893b63de3',
    }

    try {
      const response = await fetch('https://api.staticforms.dev/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })

      const result: StaticFormsResponse = await response.json()

      if (result.success) {
        setStatus('SUCCESS')
        setCaptchaToken(null)
      } else {
        console.error('Submission failed:', result.message)
        setStatus('ERROR')
        setCaptchaToken(null)
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setStatus('ERROR')
    }
  }
  if (status === 'SUCCESS') {
    return <div className='suggest-success'>Ngā mihi! Your bug report/feature suggestion has been sent.</div>
  }

  return (
    <form onSubmit={handleSubmit} className='email-form'>
      <input type='hidden' name='apiKey' value='sf_ef35e5525f14c08893b63de3' />
      <input type='text' name='honeypot' className='hidden' />

      <label htmlFor='email'>Email Address:</label>
      <input type='email' id='email' name='email' required />

      <label htmlFor='message'>Message:</label>
      <textarea id='message' name='message' required></textarea>

      <ReCAPTCHA onChange={setCaptchaToken} sitekey='6Lds-aMsAAAAADTZK2xTHmiKPI4foF2HRRalXKhg' />

      <button type='submit' disabled={status === 'SENDING'}>
        {status === 'SENDING' ? 'Sending...' : 'Submit Suggestion'}
      </button>

      {status === 'ERROR' && <p className='suggest-error'>Something went wrong. Please check the captcha and try again.</p>}
    </form>
  )
}

export default FeatureSuggestion
