# ⚖️ Architecture Trade-offs & Decision Log

## ADR 1: Event Sourcing Over State-Based Architecture

### Context
Need to coordinate complex workflows across distributed microservices with ability to debug failures and replay events.

### Decision
Implement **event sourcing** where all changes are recorded as events, with derived state.

### Rationale
✅ **Advantages:**
- Complete audit trail of all operations
- Time-travel debugging (replay events)
- Natural fit for distributed systems
- Event-driven systems are naturally scalable
- Supports "what if" analysis

❌ **Disadvantages:**
- More storage required (event log grows indefinitely)
- Eventual consistency (queries lag behind writes)
- Complexity in querying (need event projection)
- Requires careful event versioning

### Status: ✅ SELECTED
Event sourcing provides excellent observability for distributed orchestration, critical for production reliability.

---

## ADR 2: Orchestration Over Choreography

### Context
Multiple microservices need to coordinate in a specific sequence. Need to handle failures and compensation.

### Decision
Implement **orchestrator-based saga pattern** (centralized coordination) rather than choreography (event-based).

### Orchestration
```
Orchestrator → Service A → emit event → Orchestrator → Service B
(central control)
```

### Choreography
```
Service A → emit event → Service B → emit event → Service C
(decentralized, each service watches for events)
```

### Rationale
✅ **Orchestration Advantages:**
- Explicit control flow (easy to understand)
- Centralized monitoring
- Easier failure handling
- Clear saga state machine
- Better for complex workflows

❌ **Orchestration Disadvantages:**
- Central orchestrator is a bottleneck
- Need to scale orchestrator for HA
- Requires service registry
- More coupling to orchestrator

✅ **Choreography Advantages:**
- Loose coupling
- Natural event-driven
- Scales easily

❌ **Choreography Disadvantages:**
- Flow logic spread across services (hard to debug)
- Implicit dependencies (hidden in events)
- Harder to coordinate complex workflows
- Difficult to handle saga-wide failures

### Status: ✅ SELECTED
Orchestration chosen because workflow coordination is complex and explicit control flow is critical for reliability.

---

## ADR 3: In-Memory State + Persistent Event Log

### Context
Need fast saga execution but also durability for recovery from crashes.

### Decision
Keep saga execution state in memory for <100ms latency, but durably log all events.

### Patterns Considered

**Option A: Pure Durable State**
- Every change written to DB
- ✅ Perfect durability
- ❌ ~10-100ms latency per operation
- ❌ DB becomes bottleneck

**Option B: Pure In-Memory (Current)**
- State only in memory
- ✅ <1ms latency
- ❌ Lost if process crashes
- ❌ No recovery capability

**Option C: Hybrid (SELECTED)**
- Saga state in memory
- Events persisted to durable log
- ✅ <1ms execution latency
- ✅ Full recovery from crash
- ✅ Complete audit trail

### Rationale
Hybrid approach balances:
- Performance: Fast in-memory execution
- Durability: All events logged
- Recoverability: Can replay from log
- Observability: Full event audit trail

### Implementation
```typescript
// Fast in-memory execution
currentState = await executeSagaStep(step);

// Immediate event log persistence
eventLog.append({id, timestamp, step, result});
```

### Status: ✅ SELECTED
Hybrid approach provides best balance for production systems.

---

## ADR 4: Sequential Saga Steps Over Parallel Execution

### Context
Sagas typically involve sequential business logic (payment → inventory → shipping).

### Decision
Execute saga steps sequentially by default, with optional parallelization hints.

### Sequential Execution
```
Step 1: Process Payment (wait)
  ↓
Step 2: Reserve Inventory (wait)
  ↓
Step 3: Schedule Shipping (wait)
```

### Rationale
✅ **Sequential Advantages:**
- Simpler error handling
- Clear ordering of operations
- Easier to reason about compensation order
- Natural for dependent steps
- Clear failure point

❌ **Sequential Disadvantages:**
- Slower for independent steps
- 3 steps @ 100ms = 300ms total

✅ **Parallel Advantages:**
- Faster for independent steps
- 3 independent @ 100ms = ~100ms total

❌ **Parallel Disadvantages:**
- Complex failure handling
- Non-deterministic compensation order
- Harder to debug

### Status: ✅ SELECTED (with Future Option for Explicit Parallelization)
Most sagas have step dependencies, so sequential is default. Can add DAG-based parallelization later.

---

## ADR 5: In-Process Event Bus Over Message Queue

### Context
Need to publish events within same transaction. Want to avoid distributed transaction problems.

### Decision
Use in-process event bus for local event routing, with message queue bridging for cross-service events.

### In-Process Bus
```
saga → publishEvent() → local subscribers → immediate notification
```

### Message Queue Pattern
```
saga → publishEvent() → local subscribers + queue bridge → remote services
```

### Rationale
✅ **In-Process Advantages:**
- <1ms event delivery
- No infrastructure dependency
- Immediate handler execution
- Transaction-safe within process

❌ **In-Process Disadvantages:**
- Handlers must be registered at startup
- No persistence if process crashes
- Limited to single service

✅ **Message Queue Advantages:**
- Durable, survives crashes
- Decoupled services
- Scalable

❌ **Message Queue Disadvantages:**
- ~50-500ms latency
- Requires infrastructure (Kafka, RabbitMQ)
- Complexity

### Status: ✅ SELECTED (In-Process) + 🔮 FUTURE (Message Queue Bridge)
Start with in-process for simplicity and speed. Add message queue bridge for multi-service orchestration.

---

## ADR 6: UUID for Event IDs Over Sequential

### Context
Need unique, immutable event identifiers for logging and tracing.

### Decision
Use UUID v4 instead of sequential integers or timestamps.

### Rationale
✅ **UUID Advantages:**
- Globally unique (no coordination needed)
- No sequential ordering assumption
- Can generate offline
- Standard format
- Non-guessable (security benefit)

❌ **UUID Disadvantages:**
- Larger than integers (36 bytes vs 8)
- Harder for humans to read

✅ **Sequential Advantages:**
- Smaller storage
- Ordered by ID
- Human-readable

❌ **Sequential Disadvantages:**
- Requires ID generator coordination
- Reveals system throughput
- Predictable (security concern)

### Status: ✅ SELECTED
UUIDs provide immutable, globally-unique identifiers critical for distributed tracing.

---

## Summary: Trade-offs Matrix

| Pattern | Choice | Why | Alternative Cost |
|---------|:------:|-----|-------------------|
| **State** | Event Sourcing | Observability | 2-3x storage |
| **Coordination** | Orchestration | Control flow clarity | Reduced coupling |
| **Durability** | Hybrid (memory + log) | Perf + safety | Single point failure |
| **Execution** | Sequential | Simple semantics | 2-3x latency |
| **Events** | In-Process | Speed | Cross-service complexity |
| **IDs** | UUIDs | Uniqueness | Higher storage |

---

## Future Optimizations

### Short Term (3-6 months)
- [ ] Add circuit breaker for compensation retries
- [ ] Implement saga timeout policies
- [ ] Add distributed tracing (Jaeger)
- [ ] Multi-instance orchestrator (Redis state)

### Medium Term (6-12 months)
- [ ] Message queue bridge for cross-service sagas
- [ ] Event stream persistence (Kafka)
- [ ] Automatic compensation retry policies
- [ ] Dead letter queue for failed events

### Long Term (12+ months)
- [ ] AI-powered workflow optimization
- [ ] Machine learning for SLA prediction
- [ ] Predictive compensation strategies
- [ ] Self-healing workflows

---

**Document Version:** 1.0  
**Last Updated:** 2026-11-04  
**Reviewed By:** Architecture Team
