/**
 * AI Provider 工厂
 *
 * 配置方式（环境变量）：
 *   AI_PROVIDER=openrouter  + OPENROUTER_API_KEY → OpenRouterProvider
 *   AI_PROVIDER=mock                            → MockAIProvider
 *   未设置 / 其他值                              → MockAIProvider（开发/测试默认）
 *
 * 业务代码只依赖 AIProvider 接口，不感知具体厂商。
 * 未来接入新 Provider（如新加坡免费 AI API）只需：
 *   1. 新建 src/lib/ai/xxx-provider.ts 实现 AIProvider 接口
 *   2. 在下方 registry 注册
 *   3. 配置对应环境变量
 *   业务层零修改。
 */
import { AIProvider } from './provider';
import { OpenRouterProvider, MockAIProvider } from './openrouter-provider';

// ─── Provider 注册表（新增 Provider 在此登记）──────────────────────────────

const registry: Record<string, () => AIProvider> = {
  openrouter: () => new OpenRouterProvider(),
  mock: () => new MockAIProvider(),
  // 示例：未来接入新加坡免费 AI API
  // 'singapore-free': () => new SingaporeFreeProvider(),
};

// 测试注入的 provider（优先级最高）
let _testProvider: AIProvider | null = null;
let _cached: AIProvider | null = null;

/** 获取当前配置的 AI Provider（带缓存） */
export function getAIProvider(): AIProvider {
  if (_testProvider) return _testProvider;
  if (_cached) return _cached;

  const providerName = process.env.AI_PROVIDER || 'mock';
  const factory = registry[providerName];

  if (!factory) {
    console.warn(`[AI] 未知 AI_PROVIDER="${providerName}"，回退到 mock`);
    _cached = new MockAIProvider();
  } else {
    _cached = factory();
    console.log(`[AI] 使用 Provider: ${_cached.getName()}`);
  }

  return _cached;
}

/** 注入测试 Provider（测试环境专用） */
export function setTestProvider(provider: AIProvider): void {
  _testProvider = provider;
  _cached = null;
}

/** 清除测试注入 */
export function resetTestProvider(): void {
  _testProvider = null;
}

/** 清除生产缓存（配置变更后调用） */
export function resetAIProvider(): void {
  _cached = null;
  _testProvider = null;
}
