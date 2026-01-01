import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  url: string;
  size?: number;
  label?: string;
}

export function QRCode({ url, size = 200, label }: QRCodeProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      {label && (
        <p className="text-sm text-gray-500 mt-2 text-center">{label}</p>
      )}
      <p className="text-xs text-gray-400 mt-1 font-mono break-all max-w-[250px] text-center">
        {url}
      </p>
    </div>
  );
}
