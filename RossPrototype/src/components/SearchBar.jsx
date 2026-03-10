import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search items...' }) {
  return (
    <div className="search-bar">
      <Search size={18} className="search-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
