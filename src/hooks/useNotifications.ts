import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import type * as Notifications from 'expo-notifications';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const getNotifications = () => require('expo-notifications') as typeof import('expo-notifications');

export function useNotificationListener() {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription>(undefined);

  // Handle notification tap when app is running
  useEffect(() => {
    const N = getNotifications();
    responseListener.current =
      N.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.screen === 'reveal') {
          router.push('/reveal');
        }
      });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  // Handle notification tap that launched the app (cold start)
  const lastResponse = getNotifications().useLastNotificationResponse();
  useEffect(() => {
    if (lastResponse?.notification.request.content.data?.screen === 'reveal') {
      router.push('/reveal');
    }
  }, [lastResponse, router]);
}
