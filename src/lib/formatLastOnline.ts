// src/lib/formatLastOnline.ts

export function formatLastOnline(lastOnline: Date | null | undefined): {
  text: string;
  isOnline: boolean;
} {
  if (!lastOnline) {
    return { text: "Last seen a long time ago", isOnline: false };
  }

  const now = new Date();
  const diff = now.getTime() - new Date(lastOnline).getTime();
  const minutes = Math.floor(diff / 60000);

  // Consider online if last activity was within 5 minutes
  if (minutes < 5) {
    return { text: "Online", isOnline: true };
  }

  if (minutes < 60) {
    return { text: `Active ${minutes}m ago`, isOnline: false };
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return { text: `Active ${hours}h ago`, isOnline: false };
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return { text: `Active ${days}d ago`, isOnline: false };
  }

  // For 7 days or more, show the number of days ago instead of "Offline"
  return { text: `Active ${days}d ago`, isOnline: false };
}
