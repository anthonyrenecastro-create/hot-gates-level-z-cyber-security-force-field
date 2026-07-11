export type GateDecision = {
  allowed: boolean;
  reason?: string;
  confidence: number;
  route?: string;
};

export type GateContext = {
  intent: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiredCapabilities: string[];
  userTier?: string;
};

const CAPABILITY_ROUTES: Record<string, string> = {
  chat: 'eden',
  voice: 'elevenlabs',
  local_llm: 'ollama'
};

export function evaluateHotGate(ctx: GateContext): GateDecision {
  // 1. Basic confidence scoring
  let confidence = 0.5;

  if (ctx.riskLevel === 'low') confidence += 0.2;
  if (ctx.userTier === 'pro') confidence += 0.2;
  if (ctx.requiredCapabilities.length <= 2) confidence += 0.1;

  // 2. Hard denial rules
  if (ctx.riskLevel === 'high' && ctx.userTier !== 'pro') {
    return {
      allowed: false,
      reason: 'High risk action requires pro tier',
      confidence
    };
  }

  if (ctx.riskLevel === 'medium' && ctx.userTier !== 'pro') {
    return {
      allowed: false,
      reason: 'Medium risk actions require pro tier in enforcement mode',
      confidence
    };
  }

  // 3. Route selection
  const route =
    ctx.requiredCapabilities
      .map(c => CAPABILITY_ROUTES[c])
      .find(Boolean);

  if (!route) {
    return {
      allowed: false,
      reason: 'No valid execution route',
      confidence
    };
  }

  return {
    allowed: true,
    confidence,
    route
  };
}
