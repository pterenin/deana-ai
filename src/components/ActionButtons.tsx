
import React from 'react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  actions: { id: string; label: string }[];
  onAction: (id: string) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ actions, onAction }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.id)}
          className="rounded-full bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-700 text-sm px-6 py-2 transition-colors"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};
