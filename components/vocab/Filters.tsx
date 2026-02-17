import * as React from 'react';
import { Search, RotateCcw, X } from 'lucide-react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FiltersValue {
  search: string;
  partOfSpeech: string;
  level: string;
  category: string;
}

export interface FiltersProps {
  searchValue: string;
  values: FiltersValue;
  partOfSpeechOptions: FilterOption[];
  levelOptions: FilterOption[];
  categoryOptions: FilterOption[];
  activeCount: number;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: keyof Omit<FiltersValue, 'search'>, value: string) => void;
  onReset: () => void;
  onClearSearch: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  searchValue,
  values,
  partOfSpeechOptions,
  levelOptions,
  categoryOptions,
  activeCount,
  onSearchChange,
  onFilterChange,
  onReset,
  onClearSearch,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-small font-medium text-muted-foreground">
          <span>Filters</span>
          {activeCount > 0 && <Badge variant="info">{activeCount}</Badge>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          shape="circle"
          onClick={onReset}
          disabled={activeCount === 0 && searchValue.length === 0}
          aria-label="Reset all filters"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search vocabulary"
          leftSlot={<Search className="h-4 w-4" aria-hidden="true" />}
          rightSlot={
            searchValue ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : undefined
          }
        />

        <Select
          value={values.partOfSpeech}
          onChange={(event) => onFilterChange('partOfSpeech', event.target.value)}
          options={partOfSpeechOptions}
          aria-label="Filter by part of speech"
        />

        <Select
          value={values.level}
          onChange={(event) => onFilterChange('level', event.target.value)}
          options={levelOptions}
          aria-label="Filter by level"
        />

        <Select
          value={values.category}
          onChange={(event) => onFilterChange('category', event.target.value)}
          options={categoryOptions}
          aria-label="Filter by category"
        />
      </div>
    </div>
  );
};

export default Filters;
