import { childLogger } from "./logger.js";

const log = childLogger({ module: "agent-manager" });

export interface AgentTask {
  type: string;
  payload: unknown;
  traceId: string;
  pageId?: string;
}

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
  agentName?: string;
}

export interface Agent {
  name: string;
  handle(task: AgentTask): Promise<AgentResult>;
}

class AgentManager {
  private agents: Map<string, Agent> = new Map();

  register(agent: Agent): void {
    this.agents.set(agent.name, agent);
    log.info({ agent: agent.name }, "Agent registered");
  }

  async dispatch(agentName: string, task: AgentTask): Promise<AgentResult> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      log.error({ agentName }, "Agent not found");
      return { success: false, error: `Agent '${agentName}' not found` };
    }
    log.info({ agentName, traceId: task.traceId }, "Dispatching to agent");
    try {
      const result = await agent.handle(task);
      return { ...result, agentName };
    } catch (err) {
      log.error({ agentName, err }, "Agent error");
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        agentName,
      };
    }
  }

  listAgents(): string[] {
    return [...this.agents.keys()];
  }
}

export const agentManager = new AgentManager();
