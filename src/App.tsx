import { useCallback, useEffect, useState } from '@lynx-js/react'

import './App.css'
import arrow from './assets/arrow.png'
import lynxLogo from './assets/lynx-logo.png'
import reactLynxLogo from './assets/react-logo.png'
import SubmitButton from './Button.js'
import { analyzeSmart } from './utils/sensitive.js'
import { sendChat, type SendMode } from './utils/chat.js'

export function App(props: {
  onRender?: () => void
}) {
  const [alterLogo, setAlterLogo] = useState(false)
  const [inputContent, setInputContent] = useState('');
  const [censoredPreview, setCensoredPreview] = useState('');
  const [findingsCount, setFindingsCount] = useState(0);
  const [sendMode, setSendMode] = useState<SendMode>('full');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [responseText, setResponseText] = useState('');
  const USE_ML = true;

  useEffect(() => {
    console.info('Hello, Mist')
  }, [])
  props.onRender?.()

  const onTap = useCallback(() => {
    'background only'
    setAlterLogo(prevAlterLogo => !prevAlterLogo)
  }, [])

  const runAnalysis = useCallback(async (text: string) => {
    setIsAnalyzing(true)
    try {
      const { findings, censored } = await analyzeSmart(text, USE_ML)
      setFindingsCount(findings.length)
      setCensoredPreview(censored)
      setSendMode(findings.length > 0 ? 'censored' : 'full')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const onInput = useCallback((res: any) => {
    const value = res?.detail?.value ?? ''
    setInputContent(value)
    runAnalysis(value)
  }, [runAnalysis])

  const onPressSubmit = useCallback(async () => {
    if (!inputContent.trim()) return
    setIsSending(true)
    try {
      const payload = sendMode === 'censored' ? censoredPreview : inputContent
      const { output } = await sendChat(payload, sendMode)
      setResponseText(output)
    } catch (e) {
      setResponseText('Failed to send. Please try again.')
    } finally {
      setIsSending(false)
    }
  }, [inputContent, censoredPreview, sendMode])

  return (
    <view>
      <view className='Background' />
      <view className='App'>
        <view className='Banner'>
          <view className='Logo' bindtap={onTap}>
            {alterLogo
              ? <image src={reactLynxLogo} className='Logo--react' />
              : <image src={lynxLogo} className='Logo--lynx' />}
          </view>
          <text className='Title'>MIST</text>
          <text className='Subtitle'>on Lynx</text>
        </view>
        <view className="input-wrapper input-wrapper-style" 
              style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              width: "100%",
              marginBottom: "20px",
              }}>
        <input
            style={{
                flex: 1, // Takes up remaining space
                color: "blue",
                fontSize: "16px",
                height: "40px",
                borderColor: "gray",
                borderWidth: "1px",
                borderRadius: "5px",
                padding: "10px",
                marginRight: "10px", // space between input and button
            }}
            placeholder="Type to begin..."
            bindinput={onInput} />
            <view
            style={{
            height: "40px",
            padding: "0 16px",
            backgroundColor: '#ffffff',
            color: "white",
            borderRadius: "5px",
            fontSize: "16px",
            lineHeight: "40px",
            textAlign: "center",
          }}>
            <view bindtap={onPressSubmit}>
              <SubmitButton />
            </view>
          </view>
            
        </view>
        <view style={{ width: '100%', marginBottom: '12px' }}>
          <text style={{ color: '#888', fontSize: '12px' }}>
            {isAnalyzing ? 'Analyzing…' : findingsCount > 0 ? `${findingsCount} potential sensitive item(s) detected` : 'No sensitive items detected'}
          </text>
        </view>
        {findingsCount > 0 && (
          <view style={{ width: '100%', marginBottom: '12px' }}>
            <view style={{ display: 'flex', flexDirection: 'row', marginBottom: '8px' }}>
              <view
                bindtap={() => setSendMode('censored')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  marginRight: '8px',
                  backgroundColor: sendMode === 'censored' ? '#222' : '#e5e7eb'
                }}
              >
                <text style={{ color: sendMode === 'censored' ? '#fff' : '#111', fontSize: '12px' }}>Send censored</text>
              </view>
              <view
                bindtap={() => setSendMode('full')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  backgroundColor: sendMode === 'full' ? '#222' : '#e5e7eb'
                }}
              >
                <text style={{ color: sendMode === 'full' ? '#fff' : '#111', fontSize: '12px' }}>Send full</text>
              </view>
            </view>
            <view style={{ backgroundColor: '#f6f7f9', padding: '10px', borderRadius: '6px' }}>
              <text style={{ fontSize: '12px', color: '#333' }}>{`Censored text: ${censoredPreview}`}</text>
            </view>
          </view>
        )}
        {isSending && (
          <text style={{ fontSize: '12px', color: '#888' }}>Sending…</text>
        )}
        {!!responseText && (
          <view style={{ width: '100%', marginTop: '12px', marginBottom: '20px', backgroundColor: '#fff', borderRadius: '6px', padding: '12px', border: '1px solid #e5e7eb' }}>
            <text style={{ fontSize: '14px', color: '#333' }}>{responseText}</text>
          </view>
        )}
      </view>
    </view>
  )
}

