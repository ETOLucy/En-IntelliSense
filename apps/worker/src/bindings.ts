export type WorkerBindings = {
  ENVIRONMENT?: string;
  MARKET?: string;
  [binding: string]: unknown;
};

export type WorkerVariables = {
  requestId: string;
};

export type WorkerAppEnv = {
  Bindings: WorkerBindings;
  Variables: WorkerVariables;
};
