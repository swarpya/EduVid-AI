
export const getWavHeader = (audioLength: number, sampleRate: number, channelCount: number = 1): Uint8Array => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + audioLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, channelCount, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * channelCount * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, channelCount * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, audioLength, true);

  return new Uint8Array(buffer);
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export const pcmToWavBlob = (base64Pcm: string, sampleRate: number = 24000): Blob => {
  const binaryString = window.atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const header = getWavHeader(len, sampleRate);
  const wavBytes = new Uint8Array(header.length + bytes.length);
  wavBytes.set(header, 0);
  wavBytes.set(bytes, header.length);

  return new Blob([wavBytes], { type: 'audio/wav' });
};
