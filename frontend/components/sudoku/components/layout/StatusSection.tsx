import React from 'react';
import { Difficulty } from '../Difficulty';
import { Timer } from '../Timer';
import { Numbers } from '../Numbers';
import { Action } from '../Action';
import { Mode } from '../Mode';

type StatusSectionProps = {
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClickNumber: (number: string) => void;
  onClickUndo: () => void;
  onClickErase: () => void;
  onClickHint: () => void;
  onClickMistakesMode: () => void;
  onClickFastMode: () => void;
  onClickAutoSolve?: () => void;
};

export const StatusSection = (props: StatusSectionProps) => {
  return (
    <div className="flex flex-col gap-2.5 w-full lg:w-60">
      <div className="flex gap-2">
        <div className="flex-1"><Difficulty onChange={props.onChange} /></div>
        <div className="flex-1"><Timer /></div>
      </div>

      <div className="border border-border/40 bg-bg-panel p-2 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] text-muted tracking-[0.2em]">SELECT NUMBER</span>
        <Numbers onClickNumber={props.onClickNumber} />
      </div>

      <div className="flex gap-1.5">
        <Action action="undo"  onClickAction={props.onClickUndo}  />
        <Action action="erase" onClickAction={props.onClickErase} />
        <Action action="hint"  onClickAction={props.onClickHint}  />
      </div>

      <div className="flex flex-col gap-1.5">
        <Mode mode="mistakes" onClickMode={props.onClickMistakesMode} />
        <Mode mode="fast"     onClickMode={props.onClickFastMode}     />
      </div>

      {props.onClickAutoSolve && (
        <button
          onClick={props.onClickAutoSolve}
          className="mt-1 px-3 py-2 border border-dashed border-warning/50 text-warning/80 font-mono text-[10px] tracking-[0.2em] hover:bg-warning/10 hover:border-warning transition-all"
          style={{ textShadow: '0 0 6px #FFD70060' }}
        >
          ⚡ DEMO: AUTO-SOLVE
        </button>
      )}
    </div>
  );
};
