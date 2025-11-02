alter table public.profiles
  add column if not exists onboarding_step smallint default 0,
  add column if not exists onboarding_complete boolean default false,
  add column if not exists whatsapp_opt_in boolean default false;

update public.profiles
  set onboarding_step = coalesce(onboarding_step, 0),
      onboarding_complete = coalesce(onboarding_complete, false),
      whatsapp_opt_in = coalesce(whatsapp_opt_in, false)
  where onboarding_step is null
     or onboarding_complete is null
     or whatsapp_opt_in is null;
