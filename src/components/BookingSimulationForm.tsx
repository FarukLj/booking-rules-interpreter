
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useSimulationState } from "@/hooks/useSimulationState";
import { RuleResult } from "@/types/RuleResult";
import { cn } from "@/lib/utils";

interface BookingSimulationFormProps {
  rules: RuleResult;
}

export function BookingSimulationForm({ rules }: BookingSimulationFormProps) {
  const {
    selectedTags,
    selectedSpace,
    selectedDate,
    startTime,
    endTime,
    simulationResult,
    availableTags,
    availableSpaces,
    timeOptions,
    selectTag,
    setSelectedSpace,
    setSelectedDate,
    setStartTime,
    setEndTime,
    resetSimulation
  } = useSimulationState(rules);

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>New Booking Preview</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={resetSimulation}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Preview As Selector */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-3 block">
            Preview as
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <Button
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                size="sm"
                onClick={() => selectTag(tag)}
                className="h-8"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Space Selector */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Space
          </label>
          <Select value={selectedSpace} onValueChange={setSelectedSpace}>
            <SelectTrigger>
              <SelectValue placeholder="Select space" />
            </SelectTrigger>
            <SelectContent>
              {availableSpaces.map(space => (
                <SelectItem key={space} value={space}>
                  {space}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Selector */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                disabled={(date) => date < new Date()} // Disable past dates
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              From
            </label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              To
            </label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Booking Title */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Booking Title
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            value="Test Booking"
            disabled
          />
        </div>

        {/* Price Breakdown */}
        <div className="border-t pt-4">
          {simulationResult.allowed ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">Booking Allowed</h3>
              {simulationResult.duration && (
                <p className="text-sm text-green-700 mb-1">
                  Duration: {simulationResult.duration}h
                </p>
              )}
              {simulationResult.totalPrice !== undefined && (
                <p className="text-lg font-semibold text-green-800">
                  Total Price: ${simulationResult.totalPrice}
                </p>
              )}
              {simulationResult.rateLabel && (
                <p className="text-sm text-green-700">
                  {simulationResult.rateLabel}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">Booking Not Allowed</h3>
              <p className="text-sm text-red-700 mb-2">
                {simulationResult.errorReason}
              </p>
              {simulationResult.violatedRule && (
                <p className="text-xs text-red-600">
                  Rule: {simulationResult.violatedRule}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Terms & Conditions (for UI consistency) */}
        <div className="border-t pt-4">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input type="checkbox" className="rounded" disabled />
            <span>I agree to the terms and conditions</span>
          </label>
        </div>

        {/* Contact Info (disabled for simulation) */}
        <div className="space-y-3 opacity-50">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              value="Test User"
              disabled
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Phone
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              value="(555) 123-4567"
              disabled
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Organization
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              value="Test Organization"
              disabled
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
