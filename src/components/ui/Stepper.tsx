import { Fragment } from 'react';

export function Stepper({
  current,
  steps = ['Type', 'Time', 'Details', 'Payment'],
}: {
  current: number;
  steps?: string[];
}) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <Fragment key={s}>
          <div className={`step ${i === current ? 'active' : i < current ? 'done' : ''}`}>
            <div className="num">{i < current ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
          {i < steps.length - 1 && <div className="bar" />}
        </Fragment>
      ))}
    </div>
  );
}
