import { useEffect, useState } from "react";

export default function DeleteConfirmModal({
  open,
  entryTitle,
  defaultPin,
  onClose,
  onConfirm,
  busy
}) {
  const [pin, setPin] = useState(defaultPin || "");

  useEffect(() => {
    if (open) setPin(defaultPin || "");
  }, [open, defaultPin]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Confirm Delete</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="modal-subtle">
          Enter your PIN to permanently remove {entryTitle ? `"${entryTitle}"` : "this entry"}.
        </p>
        <label className="delete-pin-field">
          <span>PIN</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            autoComplete="off"
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !pin.trim()}
            onClick={() => onConfirm(pin)}
          >
            {busy ? "Deleting..." : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
