interface Props {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", confirmDanger = true, onConfirm, onCancel }: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "var(--cream, #faf8f2)", borderRadius: 14, padding: "2rem 2.25rem", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(10,22,40,0.3)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.35rem", color: "var(--navy)", marginBottom: "0.5rem" }}>
          {title}
        </h2>
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.75rem", lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "0.55rem 1.1rem", background: "none", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "var(--text-muted)", cursor: "pointer", fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "0.55rem 1.25rem", background: confirmDanger ? "#b03030" : "var(--navy)", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: confirmDanger ? "white" : "var(--gold)", cursor: "pointer", fontWeight: 600 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
