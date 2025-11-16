import { useState } from 'react'
import styles from './StoryFilter.module.css'

export type StoryFilterType = 'all' | 'inProgress' | 'completed' | 'notStarted'

interface StoryFilterProps {
  value: StoryFilterType
  onChange: (filter: StoryFilterType) => void
}

const StoryFilter = ({ value, onChange }: StoryFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const filters: { value: StoryFilterType; label: string }[] = [
    { value: 'all', label: 'All Stories' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'notStarted', label: 'Not Started' },
  ]

  const selectedFilter = filters.find((f) => f.value === value)

  const handleSelect = (filter: StoryFilterType) => {
    onChange(filter)
    setIsOpen(false)
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>Filter stories:</label>
      <div className={styles.dropdown}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span>{selectedFilter?.label}</span>
          <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>▼</span>
        </button>

        {isOpen && (
          <ul className={styles.menu} role="listbox">
            {filters.map((filter) => (
              <li key={filter.value}>
                <button
                  type="button"
                  className={`${styles.option} ${value === filter.value ? styles.optionActive : ''}`}
                  onClick={() => handleSelect(filter.value)}
                  role="option"
                  aria-selected={value === filter.value}
                >
                  {filter.label}
                  {value === filter.value && <span className={styles.checkmark}>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default StoryFilter
