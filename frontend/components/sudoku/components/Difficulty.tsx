import React from 'react';
import { useSudokuContext } from '../context/SudokuContext';

type DifficultyProps = {
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

export const Difficulty = ({ onChange }: DifficultyProps) => {
  const { difficulty } = useSudokuContext();

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs text-muted tracking-widest">DIFFICULTY</span>
      <select
        defaultValue={difficulty}
        onChange={onChange}
        className="border border-border bg-bg px-2 py-1.5 font-mono text-sm text-text focus:outline-none focus:border-primary focus:shadow-neon-cyan transition-all"
      >
        {['Easy', 'Medium', 'Hard'].map((d) => (
          <option key={d} value={d} className="bg-bg-panel">{d.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
};
