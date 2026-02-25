import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';
import { subMonths, format } from 'date-fns';

type ActivityData = { date: string; count: number };

type Props = {
  data: ActivityData[];
  startDate?: Date;
  endDate?: Date;
};

export const ActivityHeatmap: React.FC<Props> = ({
  data,
  startDate = subMonths(new Date(), 6),
  endDate = new Date(),
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={data}
        classForValue={(value) => {
          if (!value || value.count === 0) return 'color-empty';
          if (value.count <= 2) return 'color-scale-1';
          if (value.count <= 4) return 'color-scale-2';
          if (value.count <= 6) return 'color-scale-3';
          return 'color-scale-4';
        }}
        tooltipDataAttrs={(value: any) => ({
          'data-tooltip-id': 'heatmap-tooltip',
          'data-tooltip-content': value?.date
            ? `${format(new Date(value.date), 'MMM d, yyyy')}: ${value.count} practice${value.count !== 1 ? 's' : ''}`
            : 'No activity',
        })}
        onClick={(value) => {
          if (value?.date) {
            window.location.href = `/mock/reading/history?date=${value.date}`;
          }
        }}
      />
      <Tooltip id="heatmap-tooltip" />
    </div>
  );
};