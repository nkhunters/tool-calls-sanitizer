export interface SanitizerConfig {
  maxContextLength: number;
  summaryTemplates: Record<string, string>;
  preserveFailedCalls: boolean;
  debugMode: boolean;
  deduplicationEnabled: boolean;
  deduplicationWindow: number;
  strictValidation: boolean;
}

export const defaultSanitizerConfig: SanitizerConfig = {
  maxContextLength: 4000,
  preserveFailedCalls: false,
  debugMode: false,
  deduplicationEnabled: true,
  deduplicationWindow: 3,
  strictValidation: true,
  summaryTemplates: {
    execute_cql_search: 'Searched Confluence for "{cql}" and found {count} result(s)',
    get_page_content: 'Retrieved content from page: {url}',
    web_search: 'Performed web search for: {query}',
    default: 'Successfully executed {functionName} with {args}'
  }
};

export class SanitizerConfigManager {
  private config: SanitizerConfig;

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = { ...defaultSanitizerConfig, ...config };
  }

  getConfig(): SanitizerConfig {
    return this.config;
  }

  updateConfig(updates: Partial<SanitizerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getSummaryTemplate(functionName: string): string {
    return this.config.summaryTemplates[functionName] || this.config.summaryTemplates.default;
  }

  shouldPreserveFailedCalls(): boolean {
    return this.config.preserveFailedCalls;
  }

  isDebugMode(): boolean {
    return this.config.debugMode;
  }

  getMaxContextLength(): number {
    return this.config.maxContextLength;
  }

  isDeduplicationEnabled(): boolean {
    return this.config.deduplicationEnabled;
  }

  getDeduplicationWindow(): number {
    return this.config.deduplicationWindow;
  }

  isStrictValidation(): boolean {
    return this.config.strictValidation;
  }
}

export const sanitizerConfig = new SanitizerConfigManager();