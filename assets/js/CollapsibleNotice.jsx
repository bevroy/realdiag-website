function CollapsibleNotice({ title, children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-4 rounded-2xl border border-teal-300 bg-teal-50 p-6 shadow">
      <button
        type="button"
        className="flex w-full items-center justify-between text-lg font-bold text-teal-900 mb-2 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`notice-content-${title.replace(/\s+/g, '')}`}
      >
        <span>{title}</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div id={`notice-content-${title.replace(/\s+/g, '')}`}>{children}</div>
      )}
    </div>
  );
}
