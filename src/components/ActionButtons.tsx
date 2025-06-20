
import React from 'react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  actions: { id: string; label: string }[];
  onAction: (id: string) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ actions, onAction }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.id)}
          className="text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};
