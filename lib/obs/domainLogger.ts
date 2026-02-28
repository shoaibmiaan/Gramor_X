import { createRequestLogger } from '@/lib/obs/logger';

export type DomainEventName =
  | 'ai.recommendation.generated'
  | 'ai.recommendation.regenerated'
  | 'subscription.changed'
  | 'onboarding.completed'
  | 'onboarding.survey_saved'
  | 'score.updated'
  | 'dashboard.aggregate_fetched';

export function createDomainLogger(route: string, context: Record<string, unknown> = {}) {
  const logger = createRequestLogger(route, context);

  return {
    info(event: DomainEventName, metadata: Record<string, unknown> = {}) {
      logger.info(event, metadata);
    },
    warn(event: DomainEventName, metadata: Record<string, unknown> = {}) {
      logger.warn(event, metadata);
    },
    error(event: DomainEventName, metadata: Record<string, unknown> = {}) {
      logger.error(event, metadata);
    },
  };
}
