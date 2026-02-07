import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

export default function TransactionFilters({ filters, onFiltersChange }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: 'all',
      dateFrom: null,
      dateTo: null,
      minAmount: '',
      maxAmount: ''
    });
  };

  const hasActiveFilters = filters.type !== 'all' || filters.dateFrom || filters.dateTo || 
                           filters.minAmount || filters.maxAmount;

  return (
    <div className="space-y-4 p-4 bg-slate-800/30 border border-cyan-500/20 rounded-xl">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Filters</h4>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-cyan-400 hover:text-cyan-300"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transaction Type */}
        <div>
          <Label className="text-slate-300 mb-2 block">Type</Label>
          <Select value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
            <SelectTrigger className="bg-slate-900/50 border-cyan-500/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="earning">Earnings</SelectItem>
              <SelectItem value="spending">Spending</SelectItem>
              <SelectItem value="transfer_in">Transfer In</SelectItem>
              <SelectItem value="transfer_out">Transfer Out</SelectItem>
              <SelectItem value="ad_reward">Ad Rewards</SelectItem>
              <SelectItem value="creator_reward">Creator Rewards</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div>
          <Label className="text-slate-300 mb-2 block">From Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-slate-900/50 border-cyan-500/20",
                  !filters.dateFrom && "text-slate-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-800 border-cyan-500/20">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => updateFilter('dateFrom', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div>
          <Label className="text-slate-300 mb-2 block">To Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-slate-900/50 border-cyan-500/20",
                  !filters.dateTo && "text-slate-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-800 border-cyan-500/20">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => updateFilter('dateTo', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Amount Range */}
        <div>
          <Label className="text-slate-300 mb-2 block">Amount Range ($ASC)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minAmount}
              onChange={(e) => updateFilter('minAmount', e.target.value)}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxAmount}
              onChange={(e) => updateFilter('maxAmount', e.target.value)}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}