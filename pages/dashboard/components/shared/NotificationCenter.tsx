const NotificationCenter = () => {
  const notifications = [
    {
      title: 'Daily review due',
      description: '2 writing prompts are ready for revision.',
    },
    {
      title: 'New challenge unlocked',
      description: 'Join this week’s speaking sprint.',
    },
  ];

  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Notification Center</h2>
      <div className="mt-3 space-y-3">
        {notifications.map((notification) => (
          <article
            key={notification.title}
            className="rounded-xl border border-border/60 bg-background/70 p-3"
          >
            <p className="text-sm font-medium text-foreground">{notification.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{notification.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default NotificationCenter;
