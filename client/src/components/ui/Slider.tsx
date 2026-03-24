import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs font-medium text-ink-muted tabular-nums">
          {value}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-input w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border"
          style={{
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percent}%, var(--border) ${percent}%, var(--border) 100%)`,
          }}
        />
      </div>
      <style>{`
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .slider-input::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Slider;
