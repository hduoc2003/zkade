import React, { useRef, useEffect } from 'react';
import { useSudokuContext } from '../../context/SudokuContext';

type GameSectionProps = {
  onClick: (indexOfArray: number) => void;
};

export const GameSection = ({ onClick }: GameSectionProps) => {
  const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const { numberSelected, gameArray, fastMode, cellSelected, initArray } = useSudokuContext();

  const totalCells = 81;
  const fixedCells = initArray.filter(v => v !== '0').length;
  const filledCells = gameArray.filter(v => v !== '0').length;
  const playerFilled = filledCells - fixedCells;
  const totalToFill = totalCells - fixedCells;
  const progressPct = totalToFill > 0 ? Math.round((playerFilled / totalToFill) * 100) : 0;

  const prevArray = useRef<string[]>([]);
  const animKeys  = useRef<number[]>(Array(81).fill(0));

  useEffect(() => {
    const next = animKeys.current.slice();
    gameArray.forEach((v, i) => {
      if (v !== '0' && v !== prevArray.current[i]) next[i] = (next[i] ?? 0) + 1;
    });
    animKeys.current = next;
    prevArray.current = gameArray.slice();
  }, [gameArray]);

  function isRelated(row: number, col: number) {
    if (cellSelected === -1) return false;
    const sr = Math.floor(cellSelected / 9), sc = cellSelected % 9;
    if (sr === row || sc === col) return true;
    return Math.floor(sr / 3) === Math.floor(row / 3) && Math.floor(sc / 3) === Math.floor(col / 3);
  }

  function isSameValue(row: number, col: number) {
    if (fastMode) return numberSelected !== '0' && numberSelected === gameArray[row * 9 + col];
    if (cellSelected === -1 || gameArray[cellSelected] === '0') return false;
    const idx = row * 9 + col;
    return idx !== cellSelected && gameArray[idx] === gameArray[cellSelected];
  }

  function boxBorders(row: number, col: number) {
    const r = col === 2 || col === 5 ? 'border-r-[2.5px] border-r-primary/90' : 'border-r border-r-border/50';
    const b = row === 2 || row === 5 ? 'border-b-[2.5px] border-b-primary/90' : 'border-b border-b-border/50';
    return `${r} ${b}`;
  }

  const selRow = cellSelected === -1 ? -1 : Math.floor(cellSelected / 9);
  const selCol = cellSelected === -1 ? -1 : cellSelected % 9;
  const selBox = cellSelected === -1 ? -1 : Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3);

  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      {/* Grid with coordinate labels */}
      <div className="flex gap-2 items-start">
        {/* Row labels */}
        <div className="flex flex-col" style={{ marginTop: '1.25rem' }}>
          {rows.map(row => (
            <div
              key={row}
              className="flex items-center justify-center font-mono text-[10px] leading-none transition-colors duration-150"
              style={{
                width: '1rem',
                height: '3.75rem',
                color: selRow === row ? '#00FFFF' : '#606080',
                textShadow: selRow === row ? '0 0 8px #00FFFF' : 'none',
              }}
            >
              {row + 1}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-0">
          {/* Column labels */}
          <div className="flex" style={{ paddingLeft: '1px', marginBottom: '4px' }}>
            {rows.map(col => (
              <div
                key={col}
                className="flex items-center justify-center font-mono text-[10px] leading-none transition-colors duration-150"
                style={{
                  width: '3.75rem',
                  height: '1rem',
                  color: selCol === col ? '#00FFFF' : '#606080',
                  textShadow: selCol === col ? '0 0 8px #00FFFF' : 'none',
                }}
              >
                {String.fromCharCode(65 + col)}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="relative p-1">
            {/* Corner brackets */}
            {[
              'top-0 left-0 border-t-2 border-l-2',
              'top-0 right-0 border-t-2 border-r-2',
              'bottom-0 left-0 border-b-2 border-l-2',
              'bottom-0 right-0 border-b-2 border-r-2',
            ].map((cls, i) => (
              <span
                key={i}
                className={`absolute w-5 h-5 border-primary ${cls}`}
                style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }}
              />
            ))}

            <section
              className="border border-primary/70 grid-pulse"
              style={{ boxShadow: '0 0 14px #00FFFF60, 0 0 40px #00FFFF20' }}
            >
              <table className="border-collapse table-fixed">
                <tbody>
                  {rows.map((row) => (
                    <tr key={row}>
                      {rows.map((col) => {
                        const index  = row * 9 + col;
                        const value  = gameArray[index];
                        const isInit = initArray[index] !== '0';
                        const isSel  = cellSelected === index;
                        const isRel  = !isSel && isRelated(row, col);
                        const isSame = !isSel && isSameValue(row, col);
                        const empty  = value === '0';
                        const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
                        const isBoxHighlight = !isSel && !isRel && selBox !== -1 && boxIdx === selBox;

                        let bg = 'bg-bg';
                        let textCls = isInit ? 'text-text/50' : 'text-accent';
                        let extraStyle: React.CSSProperties = {};
                        let animCls = '';

                        if (isSel) {
                          bg = 'bg-secondary/20';
                          textCls = isInit ? 'text-text' : 'text-secondary';
                          animCls = 'selected-pulse';
                          extraStyle = { boxShadow: 'inset 0 0 14px #FF006E55' };
                        } else if (isSame) {
                          bg = 'bg-primary/15';
                          textCls = 'text-primary';
                          extraStyle = { textShadow: '0 0 12px #00FFFF', boxShadow: 'inset 0 0 8px #00FFFF20' };
                        } else if (isRel) {
                          bg = 'bg-primary/5';
                          textCls = isInit ? 'text-text/55' : 'text-accent/75';
                        } else if (isBoxHighlight) {
                          bg = 'bg-primary/[0.03]';
                        }

                        return (
                          <td
                            key={index}
                            className={`p-0 ${boxBorders(row, col)}`}
                            style={{ width: '3.75rem', height: '3.75rem' }}
                          >
                            <div
                              className={`w-full h-full flex items-center justify-center cursor-pointer select-none font-data text-[1.65rem] transition-all duration-100 ${bg} ${textCls} ${animCls}`}
                              style={extraStyle}
                              onClick={() => onClick(index)}
                            >
                              {!empty && (
                                <span
                                  key={`${index}-${animKeys.current[index]}`}
                                  className={isInit ? '' : 'cell-pop'}
                                  style={{ display: 'inline-block' }}
                                >
                                  {value}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full flex flex-col gap-1" style={{ paddingLeft: '1.25rem' }}>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] text-muted tracking-[0.2em] uppercase">Progress</span>
          <span className="font-mono text-[9px] tracking-wider" style={{ color: progressPct === 100 ? '#00FF41' : '#00FFFF', textShadow: progressPct === 100 ? '0 0 8px #00FF41' : 'none' }}>
            {playerFilled}/{totalToFill}
          </span>
        </div>
        <div className="h-1 bg-border/40 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: progressPct === 100 ? '#00FF41' : '#00FFFF',
              boxShadow: progressPct === 100 ? '0 0 6px #00FF41, 0 0 12px #00FF4160' : '0 0 6px #00FFFF, 0 0 12px #00FFFF60',
            }}
          />
          {/* Segment marks at 33% and 66% */}
          <div className="absolute inset-y-0 left-1/3 w-px bg-border/60" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-border/60" />
        </div>
      </div>
    </div>
  );
};
