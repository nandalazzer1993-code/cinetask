import { useRef, useEffect } from "react";

export function PinInput({ value, onChange, length = 6, autoFocus = true }: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (i: number, d: string) => {
    const clean = d.replace(/\D/g, "");
    if (!clean) {
      const next = value.split("");
      next[i] = "";
      onChange(next.join(""));
      return;
    }
    const arr = value.padEnd(length, " ").split("");
    arr[i] = clean[0];
    onChange(arr.join("").replace(/\s/g, "").slice(0, length));
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (txt) { onChange(txt); refs.current[Math.min(txt.length, length - 1)]?.focus(); e.preventDefault(); }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          className="h-12 w-10 rounded-lg border border-border bg-background text-center text-xl font-mono focus:border-primary focus:outline-none"
        />
      ))}
    </div>
  );
}
