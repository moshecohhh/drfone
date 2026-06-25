// Small Store/Lab segmented toggle reused by catalog & category panels.
export default function DomainToggle({ domain, onChange, options }) {
  return (
    <div className="mb-5 inline-flex rounded-full bg-white p-1 shadow-card">
      {options.map(({ id, label, Icon }) => {
        const active = domain === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
              active ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-light hover:text-ink'
            }`}
          >
            {Icon && <Icon size={18} />} {label}
          </button>
        )
      })}
    </div>
  )
}
