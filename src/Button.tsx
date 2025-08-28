import {useState} from '@lynx-js/react'
import arrow from './assets/arrow.png'
import invertedarrow from './assets/invertedarrow.png'

export default function SubmitButton() {
  const [isPressed, setIsPressed] = useState(false);
  const onTap = () => {
    setIsPressed(!isPressed);
  };
  return (
    <view className="submit-button" bindtap={onTap}>
      {isPressed && <view className="circle" />}
      {isPressed && <view className="circle circleAfter" />}
      <image src={isPressed ? arrow : invertedarrow} className="Arrow" />
    </view>
  )
}