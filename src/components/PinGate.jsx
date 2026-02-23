export default function PinGate({ pin, setPin, onUnlock, status, error }) {
  return (
    <div className="pin-gate">
      <div className="pin-card">
        <h2>Enter Your PIN</h2>
        <p>Use any valid family PIN to browse, post, edit, or delete your entries.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUnlock();
          }}
        >
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            autoComplete="off"
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Checking..." : "Unlock"}
          </button>
        </form>
        {error ? <div className="form-error">{error}</div> : null}
      </div>
    </div>
  );
}
