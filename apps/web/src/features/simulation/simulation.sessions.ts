type Session<State> = {
  state?: State;
  touchedAt: number;
  queue: Promise<unknown>;
  worker?: Promise<void>;
};

export function createSessionStore<State>(initialState: () => Promise<State>, ttlMs = 30 * 60_000) {
  const sessions = new Map<string, Session<State>>();

  function sessionFor(id: string): Session<State> {
    const now = Date.now();
    for (const [key, session] of sessions) {
      if (!session.worker && now - session.touchedAt > ttlMs) sessions.delete(key);
    }
    let session = sessions.get(id);
    if (!session) {
      session = { touchedAt: now, queue: Promise.resolve() };
      sessions.set(id, session);
    }
    session.touchedAt = now;
    return session;
  }

  function locked<T>(id: string, task: (session: Session<State>) => Promise<T>): Promise<T> {
    const session = sessionFor(id);
    const next = session.queue.then(() => task(session));
    session.queue = next.catch(() => undefined);
    return next;
  }

  return {
    read: (id: string) => locked(id, async (session) => (session.state ??= await initialState())),
    update: (id: string, fn: (current: State) => State | Promise<State>) => locked(id, async (session) => {
      const current = (session.state ??= await initialState());
      return (session.state = await fn(current));
    }),
    runWorker: (id: string, work: () => Promise<void>) => {
      const session = sessionFor(id);
      return (session.worker ??= work().finally(() => { session.worker = undefined; }));
    },
  };
}
