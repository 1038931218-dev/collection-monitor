/**
 * AI Provider 工厂
 *
 * 根据环境变量选择实现：
 *   - OPENROUTER_API_KEY 存在 → OpenRouterProvider
 *   - 否则 → MockAIProvider（测试/开发环境）
 *
 * 切换 Provider 只需修改此处，业务代码不感知。
 */
import { AIProvider } from './provider';
import { OpenRouterProvider, MockAIProvider } from './openrouter-provider';

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  if (process.env.OPENROUTER_API_KEY) {
    _provider = new OpenRouterProvider();
  } else {
    console.warn('[AI] OPENROUTER_API_KEY 未配置，使用 Mock Provider');
    _provider = new MockAIProvider();
  }

  return _provider;
}
