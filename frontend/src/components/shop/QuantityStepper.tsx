import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const QuantityStepper = ({ value, onChange, min = 1, max = 99 }: QuantityStepperProps) => {
  return (
    <div className="inline-flex items-center border border-border rounded-lg">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <Minus size={16} />
      </button>
      <span className="w-10 text-center text-sm font-medium text-foreground">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

export default QuantityStepper;
