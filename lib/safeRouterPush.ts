import type { NextRouter } from 'next/router';

export function safePush(router: NextRouter, href: string) {
  if (router.asPath !== href) {
    void router.push(href);
  }
}
