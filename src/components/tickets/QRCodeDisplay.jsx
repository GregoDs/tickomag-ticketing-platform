import QRCode from "react-qr-code";

function QRCodeDisplay({ payload, ticketCode }) {
  return (
    <div className="ticket-qr-display">
      <div className="ticket-qr-canvas">
        {payload ? <QRCode value={payload} size={220} bgColor="#ffffff" fgColor="#090909" level="M" title={`Entry QR for ${ticketCode}`} /> : <span>QR unavailable</span>}
      </div>
      <span>Scan at entry</span>
      <strong>{ticketCode}</strong>
    </div>
  );
}

export default QRCodeDisplay;
