import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';

export function OrganizationQrPrint({ name, code, onClose }: { name: string; code: string; onClose: () => void }) {
  return createPortal(
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body > #root { display: none !important; }
          #organization-qr-overlay { position: static !important; width: 210mm !important; height: 297mm !important; padding: 0 !important; background: white !important; }
          #organization-qr-sheet { width: 210mm !important; height: 297mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; gap: 16px !important; }
          #organization-qr-sheet svg { width: 160mm !important; height: 160mm !important; }
          #organization-qr-sheet h2 { font-size: 22pt !important; }
          #organization-qr-sheet strong { font-size: 20pt !important; }
          #organization-qr-actions { display: none !important; }
        }
      `}</style>
      <div id="organization-qr-overlay" role="dialog" aria-label={`${name} QR 코드 인쇄`} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', overflowY: 'auto', padding: 16, background: 'rgba(0,0,0,0.55)' }}>
        <div id="organization-qr-sheet" style={{ width: '100%', maxWidth: 320, margin: 'auto', padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>삶결 기관 연결 코드</span>
          <h2 style={{ margin: 0, fontSize: 20 }}>{name}</h2>
          <QRCodeSVG value={code} size={180} level="M" />
          <div>기관 코드<br /><strong style={{ color: '#15803d', fontSize: 24 }}>{code}</strong></div>
          <p style={{ fontSize: 12, color: '#64748b' }}>보호자와 활동지원사는 기관 인증 시<br />이 QR 코드를 스캔해 기관 코드를 확인하세요.</p>
          <div id="organization-qr-actions" style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, minHeight: 44, border: '1px solid #cde2d3', borderRadius: 8, background: '#f0f7f3', color: '#1a7a4a' }}>닫기</button>
            <button type="button" onClick={() => window.print()} style={{ flex: 1, minHeight: 44, border: 0, borderRadius: 8, background: '#3CAB7E', color: '#fff' }}>인쇄하기</button>
          </div>
        </div>
      </div>
    </>, document.body,
  );
}
