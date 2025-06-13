// ... (keep all the existing imports) ...

export function PricingRuleForm({
  rule,
  index,
  timeOptions,
  dayOptions,
  spaceOptions,
  rateUnitOptions,
  tagOptions,
  durationOperators,
  tagOperators,
  durationValues,
  onUpdateRule,
  onUpdateRateField,
  onAddSubCondition,
  onRemoveSubCondition,
  onUpdateSubCondition
}: PricingRuleFormProps) {
  // Safely handle time_range splitting with fallbacks
  const timeRange = typeof rule.time_range === 'string' ? rule.time_range : '09:00–24:00';
  const [startTime, endTime] = timeRange.includes('–') 
    ? timeRange.split('–') 
    : ['09:00', '24:00'];

  // Rest of your component remains the same...
  return (
    <div className="bg-[#F1F3F5] p-4 sm:p-3 rounded-lg dark:bg-slate-800">
      {/* Existing JSX remains the same */}
      <div className="flex flex-wrap items-center gap-1 text-sm font-medium mb-3 leading-6">
        <span>Between</span>

        <LinkSelect 
          value={startTime}
          onValueChange={(v) => onUpdateRule(index, 'time_range', `${v}–${endTime}`)}
        >
          {timeOptions.map(t => 
            <SelectItem key={t} value={t}>{formatTimeDisplay(t)}</SelectItem>
          )}
        </LinkSelect>

        <span>and</span>

        <LinkSelect 
          value={endTime}
          onValueChange={(v) => onUpdateRule(index, 'time_range', `${startTime}–${v}`)}
        >
          {timeOptions.map(t => 
            <SelectItem key={t} value={t}>{formatTimeDisplay(t)}</SelectItem>
          )}
        </LinkSelect>

        {/* Rest of your component remains the same */}
      </div>
      {/* ... rest of the component ... */}
    </div>
  );
}
