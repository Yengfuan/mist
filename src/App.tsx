import { useCallback, useEffect, useState } from '@lynx-js/react'

import './App.css'
import arrow from './assets/arrow.png'
import lynxLogo from './assets/lynx-logo.png'
import reactLynxLogo from './assets/react-logo.png'
import SubmitButton from './Button.js'

export function App(props: {
  onRender?: () => void
}) {
  const [alterLogo, setAlterLogo] = useState(false)
  const [inputContent, setInputContent] = useState('');

  useEffect(() => {
    console.info('Hello, Mist')
  }, [])
  props.onRender?.()

  const onTap = useCallback(() => {
    'background only'
    setAlterLogo(prevAlterLogo => !prevAlterLogo)
  }, [])

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
        <view className="input-wrapper" 
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
            bindinput={(res: any) => {
              setInputContent(res.detail.value);
            }} />
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
            <SubmitButton />
          </view>
            
        </view>
        <view style={{ flex: 1 }} />
      </view>
    </view>
  )
}

