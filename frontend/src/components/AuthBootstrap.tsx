import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as Notifications from "expo-notifications";

import { restoreSession, finishAuthLoading } from "../store/slices/authSlice";
import { getAuth } from "../storage/authStorage";
import { RootState } from "../store";

type Props = {
  children: React.ReactNode;
};

export default function AuthBootstrap({ children }: Props) {
  const dispatch = useDispatch();
  const plannedMeals = useSelector((s: RootState) => s.planner.plannedMeals);

  useEffect(() => {
    async function loadAuth() {
      try {
        const data = await getAuth();
        if (data) dispatch(restoreSession(data));
        else dispatch(finishAuthLoading());
      } catch {
        dispatch(finishAuthLoading());
      }
    }
    loadAuth();
  }, [dispatch]);

  // Cancela notificações agendadas que não existem mais no estado do planner
  useEffect(() => {
    async function syncNotifications() {
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (scheduled.length === 0) return;

        const validIds = new Set(
          plannedMeals
            .filter((m) => m.reminderTime?.notificationId)
            .map((m) => m.reminderTime!.notificationId!)
        );

        for (const n of scheduled) {
          if (!validIds.has(n.identifier)) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
          }
        }
      } catch {}
    }
    syncNotifications();
  }, []);

  return <>{children}</>;
}