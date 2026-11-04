import { v4 as uuid } from 'uuid';

export interface Event {
  id: string;
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
  source: string;
}

export interface WorkflowStep {
  id: string;
  action: string;
  onSuccess?: string;
  onFailure?: string;
  compensation?: string;
}

export interface SagaTransaction {
  id: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating';
  completedSteps: string[];
}

export class EventDrivenOrchestrator {
  private eventLog: Event[] = [];
  private sagaRegistry: Map<string, SagaTransaction> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();

  publishEvent(type: string, payload: Record<string, any>, source: string): Event {
    const event: Event = {
      id: uuid(),
      type,
      payload,
      timestamp: new Date(),
      source,
    };

    this.eventLog.push(event);

    // Trigger handlers
    if (this.eventHandlers.has(type)) {
      this.eventHandlers.get(type)!.forEach(handler => handler(event));
    }

    return event;
  }

  subscribe(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  createSaga(steps: WorkflowStep[]): SagaTransaction {
    const saga: SagaTransaction = {
      id: uuid(),
      steps,
      currentStep: 0,
      status: 'pending',
      completedSteps: [],
    };

    this.sagaRegistry.set(saga.id, saga);
    return saga;
  }

  async executeSaga(sagaId: string): Promise<SagaTransaction> {
    const saga = this.sagaRegistry.get(sagaId);
    if (!saga) throw new Error(`Saga ${sagaId} not found`);

    saga.status = 'running';

    try {
      while (saga.currentStep < saga.steps.length) {
        const step = saga.steps[saga.currentStep];

        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, 100));

        saga.completedSteps.push(step.id);
        saga.currentStep++;

        // Publish step completion event
        this.publishEvent('saga.step.completed', {
          sagaId,
          stepId: step.id,
          action: step.action,
        }, 'orchestrator');
      }

      saga.status = 'completed';
    } catch (error) {
      saga.status = 'failed';
      await this.compensateSaga(sagaId);
    }

    return saga;
  }

  private async compensateSaga(sagaId: string): Promise<void> {
    const saga = this.sagaRegistry.get(sagaId);
    if (!saga) return;

    saga.status = 'compensating';

    // Rollback in reverse order
    for (let i = saga.completedSteps.length - 1; i >= 0; i--) {
      const stepId = saga.completedSteps[i];
      const step = saga.steps.find(s => s.id === stepId);

      if (step?.compensation) {
        // Execute compensation
        await new Promise(resolve => setTimeout(resolve, 100));

        this.publishEvent('saga.compensation.executed', {
          sagaId,
          stepId,
          action: step.compensation,
        }, 'orchestrator');
      }
    }

    saga.status = 'failed';
  }

  getEventLog(): Event[] {
    return [...this.eventLog];
  }

  getSaga(sagaId: string): SagaTransaction | undefined {
    return this.sagaRegistry.get(sagaId);
  }
}
