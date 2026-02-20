function getNotifications() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as typeof import('expo-notifications');
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

export async function scheduleDailyNotification(
  hour: number,
  minute: number
): Promise<string> {
  const Notifications = getNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Foci',
      body: 'Time to review your goals.',
      data: { screen: 'reveal' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

export async function cancelAllNotifications(): Promise<void> {
  const Notifications = getNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Cancel previously scheduled notifications for a habit (stored as comma-separated ids)
export async function cancelHabitNotifications(notificationId: string | undefined): Promise<void> {
  if (!notificationId) return;
  const Notifications = getNotifications();
  const ids = notificationId.split(',');
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

// Schedule daily or specific-day notifications for a habit.
// Returns a comma-separated string of notification ids to store on the habit.
export async function scheduleHabitNotification(
  habitTitle: string,
  hour: number,
  minute: number,
  days: number[] | undefined, // undefined = every day; otherwise 0=Sun…6=Sat
): Promise<string> {
  const Notifications = getNotifications();

  if (!days || days.length === 0) {
    // Daily trigger
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: habitTitle,
        body: "Don't forget to log your habit today.",
        data: { screen: 'streak-tracker' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  }

  // One notification per selected weekday
  const ids = await Promise.all(
    days.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: habitTitle,
          body: "Don't forget to log your habit today.",
          data: { screen: 'streak-tracker' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday + 1, // expo-notifications: 1=Sun … 7=Sat
          hour,
          minute,
        },
      })
    )
  );
  return ids.join(',');
}
