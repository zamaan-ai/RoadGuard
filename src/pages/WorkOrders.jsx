import { useStore } from '../state/StoreContext';

export default function WorkOrders() {
  const { state, advanceWorkflow } = useStore();
  const hasActive = state.workflow.some((s) => s.status === 'active');

  return (
    <section id="workorders" className="page generic active">
      <div className="page-head">
        <div><span className="overline">CLOSED-LOOP RESPONSE</span><h1>Work Orders</h1><p>From AI detection to repair verification.</p></div>
        {hasActive && <button className="btn primary" onClick={advanceWorkflow}>Advance Stage →</button>}
      </div>
      <div className="workflow">
        {state.workflow.map((step) => (
          <div className={`workflow-step ${step.status}`} key={step.id}>
            <b>{String(step.id).padStart(2, '0')}</b>
            <div><h2>{step.title}</h2><p>{step.desc}</p></div>
            <span>{step.status === 'done' ? 'Complete ✓' : step.status === 'active' ? 'In Progress' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
