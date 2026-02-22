'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

type Props = {
  onDetected: (barcode: string) => void;
};

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      BrowserCodeReader.releaseAllStreams();
    };
  }, []);

  const startScan = async () => {
    if (!videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    setRunning(true);

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const selected = devices[0]?.deviceId;
      if (!selected) {
        setRunning(false);
        return;
      }

      controlsRef.current = await reader.decodeFromVideoDevice(selected, videoRef.current, (result) => {
        if (!result) return;
        onDetected(result.getText());
        controlsRef.current?.stop();
        setRunning(false);
      });
    } catch {
      controlsRef.current?.stop();
      setRunning(false);
    }
  };

  const stopScan = () => {
    controlsRef.current?.stop();
    setRunning(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" className="px-3 py-2 rounded bg-gray-800 text-white" onClick={startScan} disabled={running}>
          {running ? '掃描中...' : '開始掃描'}
        </button>
        {running ? <button type="button" className="px-3 py-2 rounded bg-gray-200" onClick={stopScan}>停止</button> : null}
      </div>
      <video ref={videoRef} className="w-full max-w-md rounded border bg-black" />
    </div>
  );
}
