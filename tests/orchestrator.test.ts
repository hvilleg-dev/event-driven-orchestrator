import { EventDrivenOrchestrator, Event } from '../src/index';

describe('EventDrivenOrchestrator', () => {
  let orchestrator: EventDrivenOrchestrator;

  beforeEach(() => {
    orchestrator = new EventDrivenOrchestrator();
  });

  test('should publish events', () => {
    const event = orchestrator.publishEvent('user.created', { userId: '123' }, 'auth-service');

    expect(event).toBeDefined();
    expect(event.type).toBe('user.created');
    expect(event.payload.userId).toBe('123');
  });

  test('should subscribe to events', (done) => {
    orchestrator.subscribe('user.created', (event: Event) => {
      expect(event.type).toBe('user.created');
      done();
    });

    orchestrator.publishEvent('user.created', { userId: '123' }, 'auth-service');
  });

  test('should create and track sagas', async () => {
    const saga = orchestrator.createSaga([
      { id: 'step1', action: 'process-payment', onSuccess: 'step2', compensation: 'refund' },
      { id: 'step2', action: 'send-confirmation', onSuccess: undefined, compensation: 'unsend' },
    ]);

    expect(saga).toBeDefined();
    expect(saga.status).toBe('pending');
  });

  test('should execute sagas successfully', async () => {
    const saga = orchestrator.createSaga([
      { id: 'step1', action: 'create-order', onSuccess: 'step2' },
      { id: 'step2', action: 'reserve-inventory', onSuccess: undefined },
    ]);

    await orchestrator.executeSaga(saga.id);

    const result = orchestrator.getSaga(saga.id);
    expect(result?.status).toBe('completed');
    expect(result?.completedSteps.length).toBe(2);
  });

  test('should track event log', () => {
    orchestrator.publishEvent('event1', {}, 'service1');
    orchestrator.publishEvent('event2', {}, 'service2');

    const log = orchestrator.getEventLog();
    expect(log.length).toBe(2);
  });
});
